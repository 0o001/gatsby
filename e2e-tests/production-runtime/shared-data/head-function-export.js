const path = `/head-function-export`

const page = {
  basic: `${path}/basic/`,
  pageQuery: `${path}/page-query/`,
  reExport: `${path}/re-exported-function/`,
  staticQuery: `${path}/static-query-component/`,
  warnings: `${path}/warnings/`,
  allProps: `${path}/all-props/`,
}

const data = {
  static: {
    base: `http://localhost:9000`,
    title: `Ella Fitzgerald's Page`,
    meta: `Ella Fitzgerald`,
    noscript: `You take romance - I will take Jell-O!`,
    style: `rebeccapurple`,
    link: `/used-by-head-function-export-basic.css`,
  },
  queried: {
    base: `http://localhost:9000`,
    title: `Nat King Cole's Page`,
    meta: `Nat King Cole`,
    noscript: `There is just one thing I cannot figure out. My income tax!`,
    style: `blue`,
    link: `/used-by-head-function-export-query.css`,
  },
}

module.exports = { page, data }