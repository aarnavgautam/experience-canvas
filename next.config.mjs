import withPWA from 'next-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// next-pwa generates SW with absolute paths; project paths containing apostrophes (e.g. "julia's")
// break the generated JS. Disable PWA unless path is safe, or set ENABLE_PWA=1 from a path without '.
const pathHasApostrophe = __dirname.includes("'");
const pwaDisabled = process.env.NODE_ENV === 'development' || pathHasApostrophe;

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['konva', 'canvas']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  webpack: (config, { isServer }) => {
    const konvaRoot = path.resolve(__dirname, 'node_modules/konva');
    const konvaLib = path.join(konvaRoot, 'lib');
    const konvaBrowserEntry = path.join(konvaLib, 'index.js');

    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
      config.resolve.alias = {
        ...config.resolve.alias,
        'konva/lib/index-node.js': konvaBrowserEntry,
        'konva/lib': konvaLib,
        'konva$': konvaBrowserEntry
      };
      // Replace any request for konva's Node entry with browser entry
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /[\\/]konva[\\/]lib[\\/]index-node\.js$/,
          path.resolve(__dirname, 'node_modules/konva/lib/index.js')
        )
      );
    }
    return config;
  }
};

export default withPWA({
  dest: 'public',
  disable: pwaDisabled
})(baseConfig);

