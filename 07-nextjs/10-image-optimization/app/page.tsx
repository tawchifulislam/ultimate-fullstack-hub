// @ts-nocheck
// This comment disables TypeScript errors so you can read the code cleanly.
// Note: React, Next.js, and their type definitions are not installed in this
// learning resource.

import Image from "next/image";
import localPhoto from "../public/local-photo.png";

export default function HomePage() {
  return (
    <main>
      <h1>Image Optimization Demo</h1>

      {/* Statically imported local image: Next reads the real file at
          build time, so width/height are supplied automatically, and
          placeholder="blur" gets an auto-generated blurDataURL, no
          manual base64 string needed. priority disables lazy loading
          and preloads it, meant for above-the-fold images. */}
      <Image
        id="hero-image"
        src={localPhoto}
        alt="Hero"
        placeholder="blur"
        priority
      />

      {/* Same local image, but NOT priority: lazy-loaded by default,
          no preload link, for comparison. */}
      <Image
        id="lazy-image"
        src={localPhoto}
        alt="Lazy"
        width={400}
        height={300}
      />

      {/* A remote image. Its host (localhost:4000) is in
          next.config.js's images.remotePatterns, so Next is willing to
          fetch and optimize it. Remote images always need an explicit
          width/height, Next cannot read the file to auto-detect them. */}
      <Image
        id="remote-image"
        src="http://localhost:4000/remote-photo.png"
        alt="Remote"
        width={1200}
        height={800}
      />
    </main>
  );
}
