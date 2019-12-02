const serveStatic = require("serve-static");
const dree = require("dree");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

module.exports = {
  devServer: {
    before(app) {
      const ROOT = "../data/slides";
      app.use(bodyParser.json());

      app.use("/build", serveStatic("../data"));
      app.use("/build", serveStatic("../reveal-md/dist"));
      app.get("/api/", (req, res) => {
        res.json({
          dirTree: dree.scan(ROOT, {
            extensions: ["md"],
            exclude: [/\.git/, /node_modules/]
          })
        })
      });
      app.get("/api/data", (req, res) => {
        const { filename } = req.query;
        res.send(fs.readFileSync(path.join(ROOT, filename), "utf8"));
      });
      app.put("/api/data", (req, res) => {
        const { filename, content } = req.body;
        fs.writeFileSync(path.join(ROOT, filename), content);
        return res.sendStatus(201);
      })
    }
  }
};