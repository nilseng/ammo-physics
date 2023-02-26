import express from "express";
import path from "path";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const app = express();

app.use(express.static(path.join(__dirname, "../../client/dist")));
app.use("/", express.static(path.join(__dirname, "../../client/dist/index.html")));

export const startServer = () => {
  const serverPromise = new Promise((resolve) => {
    const port = process.env.PORT || 4000;
    app.listen({ port }, () => {
      console.log(`Server listening on port ${port}`);
      resolve(app);
    });
  });
  return serverPromise;
};
