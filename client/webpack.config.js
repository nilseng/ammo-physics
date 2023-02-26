const path = require("path");

module.exports = {
  mode: "development",
  experiments: {
    topLevelAwait: true,
  },
  resolve: {
    fallback: {
      path: false,
      fs: false,
    },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
  },
};
