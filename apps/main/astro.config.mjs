import { readFileSync } from "node:fs"
import path from "node:path"
import mdx from "@astrojs/mdx"
import react from "@astrojs/react"
import { blogIntegration } from "@mijime/blog/integration"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"

const blogContentsDir = path.join(
  process.cwd(),
  "../../packages/blog-contents/contents",
)

// 実機（スマホ・タブレット）確認用のHTTPS。DEV_TLS_DIR に server.key / server.crt を
// 置いたディレクトリを渡すと dev サーバがその証明書で TLS を張る。カメラ・マイクは
// セキュアコンテキスト（https か localhost）でしか動かないため。未設定なら HTTP。
const devTlsDir = process.env["DEV_TLS_DIR"]
const devTls = devTlsDir
  ? {
      cert: readFileSync(path.join(devTlsDir, "server.crt")),
      key: readFileSync(path.join(devTlsDir, "server.key")),
    }
  : undefined

export default defineConfig({
  server: { host: "0.0.0.0" },
  integrations: [
    react(),
    mdx(),
    blogIntegration({
      globalCss: "/src/styles/global.css",
      siteUrl: "https://mijime.github.io",
      siteName: "mijime",
      contentsDir: blogContentsDir,
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["lucide-react", "react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react-dom/client"],
    },
    server: { https: devTls },
  },
  output: "static",
})
