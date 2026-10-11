/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Only localhost:4000 is allowed to be optimized as a remote image.
    // localhost:4001 (used in the notes to prove the allowlist) is
    // deliberately left out.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
