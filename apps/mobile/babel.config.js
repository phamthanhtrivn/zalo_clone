module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
<<<<<<< HEAD
=======
    plugins: ["react-native-reanimated/plugin"],
>>>>>>> origin/main
  };
};
