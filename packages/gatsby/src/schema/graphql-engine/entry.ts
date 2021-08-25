// import { buildSchema } from "../schema"
// import fs from "fs";
import { build } from "../index"
import { setupLmdbStore } from "../../datastore/lmdb/lmdb-datastore"
import { store } from "../../redux"
import { actions } from "../../redux/actions"
import reporter from "gatsby-cli/lib/reporter"
import {
  createGraphQLRunner,
  Runner,
} from "../../bootstrap/create-graphql-runner"
// const { builtInFieldExtensions } = require(`./extensions`)

import { setGatsbyPluginCache } from "../../utils/require-gatsby-plugin"
import apiRunnerNode from "../../utils/api-runner-node"
import type { IGatsbyPage, IGatsbyState } from "../../redux/types"
import { findPageByPath } from "../../utils/find-page-by-path"
import { getDataStore } from "../../datastore"
import {
  gatsbyNodes,
  gatsbyWorkers,
  flattenedPlugins,
  // @ts-ignore
} from ".cache/query-engine-plugins"

export class GraphQLEngine {
  // private schema: GraphQLSchema
  private runner?: Runner
  private runnerPromise?: Promise<Runner>

  constructor({ dbPath }: { dbPath: string }) {
    setupLmdbStore({ dbPath })
    // start initting runner ASAP
    this.getRunner()
  }

  private async _doGetRunner(): Promise<Runner> {
    // @ts-ignore SCHEMA_SNAPSHOT is being "inlined" by bundler
    store.dispatch(actions.createTypes(SCHEMA_SNAPSHOT))

    // TODO: FLATTENED_PLUGINS needs to be merged with plugin options from gatsby-config
    //  (as there might be non-serializable options, i.e. functions)
    store.dispatch({
      type: `SET_SITE_FLATTENED_PLUGINS`,
      payload: flattenedPlugins,
    })

    for (const pluginName of Object.keys(gatsbyNodes)) {
      setGatsbyPluginCache(
        { name: pluginName, resolve: `` },
        `gatsby-node`,
        gatsbyNodes[pluginName]
      )
    }
    for (const pluginName of Object.keys(gatsbyWorkers)) {
      setGatsbyPluginCache(
        { name: pluginName, resolve: `` },
        `gatsby-worker`,
        gatsbyWorkers[pluginName]
      )
    }
    await apiRunnerNode(`unstable_onPluginInit`)
    await apiRunnerNode(`createSchemaCustomization`)

    // Build runs
    await build({ fullMetadataBuild: false, freeze: true })

    // this.schema = await buildSchema({
    //   types: [{ typeOrTypeDef: SCHEMA_SNAPSHOT }, { name: `query-engine` }],
    // })

    // this.schema = store.getState().schema

    return createGraphQLRunner(store, reporter)
  }

  private async getRunner(): Promise<Runner> {
    if (this.runner) {
      return this.runner
    } else if (this.runnerPromise) {
      return this.runnerPromise
    } else {
      this.runnerPromise = this._doGetRunner()
      this.runnerPromise.then(runner => {
        this.runner = runner
        this.runnerPromise = undefined
      })
      return this.runnerPromise
    }
  }

  public async runQuery(...args: Parameters<Runner>): ReturnType<Runner> {
    return (await this.getRunner())(...args)
    // return execute({
    //   schema: await this.getSchema(),
    //   document: parse(wat),
    // })
  }

  public findPageByPath(pathName: string): IGatsbyPage | undefined {
    // adapter so `findPageByPath` use SitePage nodes in datastore
    // instead of `pages` redux slice
    const state = {
      pages: {
        get(pathName: string): IGatsbyPage | undefined {
          return getDataStore().getNode(`SitePage ${pathName}`) as
            | IGatsbyPage
            | undefined
        },
        values(): Iterable<IGatsbyPage> {
          return getDataStore().iterateNodesByType(
            `SitePage`
          ) as Iterable<IGatsbyPage>
        },
      },
    } as unknown as IGatsbyState

    return findPageByPath(state, pathName, false)
  }
}

export default { GraphQLEngine }
