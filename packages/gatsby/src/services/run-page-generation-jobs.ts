import { store } from "../redux/index"
import { createInternalJob } from "../utils/jobs/manager"
import { createJobV2FromInternalJob } from "../redux/actions/internal"

export function runPageGenerationJobs(queryIds): void {
  queryIds.pageQueryIds.forEach(queryId => {
    const job = createInternalJob(
      {
        name: `GENERATE_PAGE`,
        args: {
          path: queryId.path,
        },
        inputPaths: [],
        outputDir: __dirname,
        plugin: {
          name: `gatsby`,
          version: `4.10.1`,
          resolve: __dirname,
        },
      },
      {
        name: `gatsby`,
        version: `4.10.1`,
        resolve: __dirname,
      }
    )

    createJobV2FromInternalJob(job)(store.dispatch, store.getState)
  })
}
