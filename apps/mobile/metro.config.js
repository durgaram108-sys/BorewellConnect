// Metro config for a pnpm monorepo: watch the workspace root and resolve
// packages from both the app's and the root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

// Force a single copy of React and friends. Other workspace apps (admin) can
// pull in their own React; if a hoisted duplicate wins resolution, hooks crash
// with "Cannot read properties of null (reading 'useState')".
const singletons = ["react", "react-dom", "react-native", "react-native-web", "scheduler"];
const appEntry = path.join(projectRoot, "index.ts");
const prevResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const base = moduleName.startsWith("@") ? moduleName : moduleName.split("/")[0];
  const ctx =
    singletons.includes(base)
      ? { ...context, originModulePath: appEntry } // resolve from the app's own node_modules
      : context;
  return prevResolveRequest
    ? prevResolveRequest(ctx, moduleName, platform)
    : ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
