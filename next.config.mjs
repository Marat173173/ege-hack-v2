/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // В Next 14 — experimental.serverComponentsExternalPackages.
  // Transformers.js / onnxruntime / sharp нельзя бандлить на сервере.
  experimental: {
    serverComponentsExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
        "sharp": "commonjs sharp",
      });
    }
    return config;
  },
};

export default nextConfig;
