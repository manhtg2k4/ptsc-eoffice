// @ts-nocheck
/* eslint-disable no-undef */
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackPwaManifest = require("webpack-pwa-manifest");
const WorkboxWebpackPlugin = require("workbox-webpack-plugin");
const { HashedModuleIdsPlugin } = require("webpack").ids;
const TerserPlugin = require("terser-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

const isProduction = process.env.NODE_ENV === "production";
const stylesHandler = isProduction ? MiniCssExtractPlugin.loader : "style-loader";

const config = {
  entry: "./src/index.js",
  cache: {
    type: "filesystem",
    allowCollectingMemory: true,
    idleTimeout: 10000, // Lưu cache xuống đĩa sau 10 giây nhàn rỗi (mặc định 60s)
    idleTimeoutForInitialStore: 0, // Lưu cache ban đầu ngay lập tức sau khi compile thành công
  },
  output: {
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].chunk.js",
    path: path.resolve(process.cwd(), "build"),
    publicPath: "/",
    clean: true, // Xóa file cũ khi build mới
  },
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: { comparisons: false },
          output: { comments: false, "ascii_only": true },
        },
        parallel: true, // Chạy song song trên nhiều CPU
      }),
    ],
    splitChunks: {
      chunks: "all",
      minSize: 30000,
      maxSize: 250000, // Giới hạn file chunk để tránh quá lớn
      cacheGroups: {
        reactVendor: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: "react-vendor",
          chunks: "all",
          priority: 40,
        },
        muiVendor: {
          test: /[\\/]node_modules[\\/](@mui)[\\/]/,
          name: "mui-vendor",
          chunks: "all",
          priority: 39,
        },
        bpmnVendor: {
          test: /[\\/]node_modules[\\/](bpmn-js|camunda-bpmn-moddle)[\\/]/,
          name: "bpmn-vendor",
          chunks: "all",
          priority: 38,
        },
        kendoVendor: {
          test: /[\\/]node_modules[\\/](@progress)[\\/]/,
          name: "kendo-vendor",
          chunks: "all",
          priority: 37,
        },
        calendarVendor: {
          test: /[\\/]node_modules[\\/](@fullcalendar)[\\/]/,
          name: "calendar-vendor",
          chunks: "all",
          priority: 36,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 30,
        },
        common: {
          test: /[\\/]src[\\/](components|utils)[\\/]/,
          name: "common",
          minChunks: 2,
          chunks: "all",
          priority: 20,
        },
      },
    },
    runtimeChunk: "single",
  },
  devServer: {
    port: 8080,
    static: { directory: path.join(__dirname, "public") },
    compress: true,
    historyApiFallback: true,
    hot: true,
    open: true,
    headers: {
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'; object-src 'none';"
    },
    client: {
      overlay: true, // Hiển thị lỗi trực tiếp trên UI
    },
    watchFiles: ["src/**/*"], // Theo dõi thay đổi file trong src
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],  // <-- thêm dòng này
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@hooks": path.resolve(__dirname,"src/hooks"),
      "@EnvironmentFile": path.resolve(__dirname, "src/EnvironmentFile"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@config": path.resolve(__dirname, "src/config"),
      "@styles": path.resolve(__dirname, "src/styles"),
      "@layouts": path.resolve(__dirname, "src/layouts"),
      "@redux": path.resolve(__dirname, "src/redux"),
      "@routers": path.resolve(__dirname, "src/routers"),
      "@services": path.resolve(__dirname, "src/services"),
      "@AuthContext": path.resolve(__dirname, "src/AuthContext"),

      "@layout": path.resolve(__dirname, "src/builder-form-export/Layouts"),
      "@component": path.resolve(__dirname, "src/builder-form-export/components"),

      "@builder-form": path.resolve(__dirname, "src/builder-form"),
      "@builder-popup": path.resolve(__dirname, "src/builder-popup"),
      "@builder-form-export": path.resolve(__dirname, "src/builder-form-export"),
      "@builder-table": path.resolve(__dirname, "src/builder-table"),
      "@helper": path.resolve(__dirname, "src/helper"),
      "@variable": path.resolve(__dirname, "src/variable"),
    },
    fallback: {
      buffer: require.resolve("buffer/"),
    },
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      minify: isProduction ? {
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true,
        minifyCSS: true,
      } : false,
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser.js",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "public",
          to: "",
          globOptions: {
            ignore: ["**/index.html"],
          },
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        use: [
          ...(isProduction ? ["thread-loader"] : []),
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true, // Lưu cache giúp build nhanh hơn
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      },
      { test: /\.css$/i, use: [stylesHandler, "css-loader", "postcss-loader"] },
      { test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i, type: "asset" },
    ],
  },
};

module.exports = (env) => {
  if (isProduction) {
    config.mode = "production";
    config.plugins.push(
      new WorkboxWebpackPlugin.GenerateSW(),
      new CompressionPlugin({
        filename: "[path][base].br",
        algorithm: "brotliCompress",
        test: /\.(js|css|html|svg)$/,
        compressionOptions: { level: 11 },
        threshold: 10240,
        minRatio: 0.8,
      }),
      new WebpackPwaManifest({
        name: "React Boilerplate",
        shortName: "React BP",
        description: "My React Boilerplate-based project!",
        backgroundColor: "#fafafa",
        themeColor: "#b1624d",
        inject: true,
      })
    );
  } else {
    config.mode = "development";
    config.devtool = "eval-cheap-module-source-map";
  }

  if (env && env.analyze) {
    config.plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      analyzerHost: '127.0.0.1',
      analyzerPort: 8888,
      openAnalyzer: true
    }));
  }

  return config;
};
