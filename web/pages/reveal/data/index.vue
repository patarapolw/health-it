<template lang="pug">
div
  #global(ref="global")
  .reveal
    .slides
</template>

<script lang="ts">
import { Vue, Component } from "nuxt-property-decorator";
import pug, { IHyperPugFilters } from "hyperpug";
import showdown, { ShowdownExtension } from "showdown";
import { HLJSStatic } from "highlight.js";
import h from "hyperscript";
import matter from "gray-matter";

declare global {
  interface Window {
    Reveal: RevealStatic;
    hljs: HLJSStatic;
    revealMd: RevealMd;
  }
}

export interface ISlide {
  lang?: string;
  comment?: string;
  content: string;
  raw: string;
}

const revealCdn = "https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/";
const mdConverter = new showdown.Converter();
mdConverter.setFlavor("github");

@Component({
  layout: "clear",
  head() {
    return {
      link: [
        {
          rel: "stylesheet",
          type: "text/css",
          href: `${revealCdn}css/reveal.css`
        }
      ],
      script: [
        { src: `${revealCdn}js/reveal.min.js` },
        { src: `${revealCdn}plugin/highlight/highlight.js`, async: true }
      ]
    };
  }
})
export default class RevealMd extends Vue {
  _headers: any = {};
  _queue: Array<(r?: RevealStatic) => void> = [];
  _markdown: string = "";
  _raw: ISlide[][] = [[]];

  get headers() {
    return this._headers;
  }

  set headers(h) {
    this.onReady((reveal) => {
      if (h.theme) {
        this.theme = h.theme;
      }

      if (reveal) {
        reveal.configure(h);
      }
    });

    this._headers = h;
  }

  get markdown() {
    return this._markdown;
  }

  set markdown(s: string) {
    let reverseOffset = 0;

    const newRaw = s.split(/\r?\n===\r?\n/g).map((el, x) => {
      const sectionRaw = this.parseSlide(el);
      if (sectionRaw.comment) {
        const lines = sectionRaw.comment.split("\n");
        for (const line of lines) {
          if (["hidden", "global"].includes(line)) {
            if (line === "global") {
              const global = document.getElementById("global");
              if (global) {
                let el = global.querySelector("#global--main");
                if (!el) {
                  el = document.createElement("div");
                  el.id = "global--main";
                  global.appendChild(el);
                }
                el.innerHTML = sectionRaw.content;
                Array.from(el.getElementsByTagName("script")).forEach((el) => {
                  eval(el.innerHTML);
                });
              }
            }

            reverseOffset++;
            return null;
          } else if (line.startsWith("ref=")) {
            const global = document.getElementById("global");
            if (global) {
              const ref = line.split("=")[1];
              let el = global.querySelector(`#global--${CSS.escape(ref)}`);
              if (!el) {
                el = document.createElement("div");
                el.id = `global--${CSS.escape(ref)}`;
              }
              const url = new URL("/api/data", location.origin);
              url.searchParams.set("filename", ref);
              fetch(url.href).then((r) => r.text()).then((r) => {
                if (r) {
                  el = el!;
                  el.innerHTML = this.parseSlide(r).content;
                  global.appendChild(el);
                  Array.from(el.getElementsByTagName("script")).forEach((el) => {
                    eval(el.innerHTML);
                  });
                }
              })
            }
          }
        }
        
      }

      x -= reverseOffset;
      this._raw[x] = this._raw[x];

      return el.split(/\r?\n--\r?\n/g).map((ss, y) => {
        const thisRaw = this.parseSlide(ss);

        if (!this._raw[x][y] || (this._raw[x][y] && this._raw[x][y].raw !== ss)) {
          const container = document.createElement("div");
          container.className = "container";
          container.innerHTML = thisRaw.content;

          let subSection = this.getSlide(x, y);
          let section = this.getSlide(x);

          if (section && subSection) {
            const oldContainers = subSection.getElementsByClassName("container");
            Array.from(oldContainers).forEach((el) => el.remove());
            subSection.appendChild(container);
          } else {
            const ss = document.createElement("section");
            ss.append(container);

            if (section) {
              section.appendChild(ss);
            } else {
              const s = document.createElement("section");
              s.append(ss);
              this.$el.querySelector(".reveal .slides")!.appendChild(s);
            }
          }

          Array.from(container.querySelectorAll("pre code:not(.hljs)")).forEach((el) => {
            if (window.hljs) {
              window.hljs.highlightBlock(el);
            }
          });
        }

        return thisRaw;
      });
    }).filter((el) => el !== null) as ISlide[][];

    this._raw.map((el, x) => {
      el.map((ss, j) => {
        const y = el.length - j - 1;

        if (!newRaw[x] || !newRaw[x][y]) {
          const subSection = this.getSlide(x, y);
          if (subSection) {
            subSection.remove();
          }
        }
      });

      if (!newRaw[x]) {
        const section = this.getSlide(x);
        if (section) {
          section.remove();
        }
      }
    });

    this._raw = newRaw;
  }

  get theme() {
    const el = document.getElementById("reveal-theme") as HTMLLinkElement;
    if (el) {
      const m = /\/(\S+)\.css$/.exec(el.href);
      if (m) {
        return m[1];
      }
    }

    return "";
  }

  set theme(t) {
    let el = document.getElementById("reveal-theme") as HTMLLinkElement;
    if (!el) {
      el = document.createElement("link");
      Object.assign(el, {
        id: "reveal-theme",
        rel: "stylesheet",
        type: "text/css"
      });
      document.head.appendChild(el);
    }

    el.href = `${revealCdn}/css/theme/${t}.css`;
  }

  async mounted() {
    if (process.client) {
      this.theme = "white";
      window.revealMd = this;

      const { filename } = this.$route.query;
      if (filename) {
        this.buildFromString(await fetch(`/build/${filename}`).then((r) => r.text()));
      }
    }
  }

  buildFromString(s: string) {
    const { data, content } = matter(s);
    this.headers = data;
    this.markdown = content;
  }

  mdConvert(s: string) {
    return mdConverter.makeHtml(s);
  }

  pugConvert(s: string) {
    return pug.compile({
      filters: {
        markdown: ss => {
          return this.mdConvert(ss);
        }
      }
    })(s);
  }

  onReady(fn?: (reveal?: RevealStatic) => void) {
    const reveal = window.Reveal;
    if (reveal) {
      if (!reveal.isReady()) {
        reveal.initialize();
        if (this._queue.length > 0) {
          this._queue.forEach(it => it(reveal));
          reveal.slide(-1, -1, -1);
          reveal.sync();
        }
      }

      if (fn) {
        fn(reveal);
      }
    } else {
      if (fn) {
        this._queue.push(fn);
      }

      setTimeout(() => {
        this.onReady();
        const reveal = window.Reveal;
        if (reveal) {
          reveal.slide(-1, -1, -1);
          reveal.sync();
        }
      }, 1000);
    }
  }

  parseSlide(text: string): ISlide {
    const raw = text;
    let lang = "";

    const commentLines: string[] = [];
    const contentLines: string[] = [];
    let isContent = true;

    for (const line of text.split("\n")) {
      isContent = true;

      if (contentLines.length === 0 && line.startsWith("// ")) {
        commentLines.push(line.substr(3));
        isContent = false;
      }

      if (lang && line.startsWith("```")) {
        break;
      }

      if (contentLines.length === 0 && line.startsWith("```")) {
        lang = line.substr(3);
        isContent = false;
      }

      if (isContent) {
        contentLines.push(line);
      }
    }

    lang = lang || "markdown";

    const comment = commentLines.join("\n");
    let html = contentLines.join("\n") || text;

    switch (lang) {
      case "markdown": html = this.mdConvert(html); break;
      case "html": break;
      case "pug": html = this.pugConvert(html); break;
      default:
        const pre = h("pre");
        pre.innerText = html;
        html = pre.outerHTML;
    }

    return { lang, comment, content: html, raw };
  }

  getSlide(x: number, y?: number) {
    const s = this.$el.querySelectorAll(".slides > section");
    const hSlide = s[x];

    if (typeof y === "number") {
      if (hSlide) {
        return Array.from(hSlide.children).filter((el) => el.tagName.toLocaleUpperCase() === "SECTION")[y];
      }

      return undefined;
    }

    return hSlide;
  }
}
</script>

<style lang="scss">
#global {
  display: none;
}
</style>