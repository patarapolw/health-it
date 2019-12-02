import pug from "hyperpug";
import showdown from "showdown";
import { HLJSStatic } from "highlight.js";
import h from "hyperscript";
import matter from "gray-matter";
// @ts-ignore
import scopeCss from "scope-css";

declare global {
  interface Window {
    Reveal: RevealStatic;
    hljs: HLJSStatic;
    revealMd: RevealMd;
  }
}

export interface ISlide {
  id: string;
  type: "hidden" | "global" | "regular";
  html: string;
  raw: string;
}

const revealCdn = "https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/";
const mdConverter = new showdown.Converter();
mdConverter.setFlavor("github");

async function main() {
  let defaults = {
    headers: {},
    markdown: ""
  }

  const url = new URL(location.href);
  const filename = url.searchParams.get("filename");
  if (filename) {
    const { data, content } = matter(await fetch(`/build/slides/${filename}`).then((r) => r.text()));
    defaults = {
      headers: data,
      markdown: content
    }
  }
  
  new RevealMd(defaults);
}

export default class RevealMd {
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
    const globalEl = document.getElementById("global") as HTMLDivElement;
    Array.from(globalEl.querySelectorAll("style.ref")).map((el) => el.remove());

    let xOffset = 0;
    const newRaw = s.split(/\r?\n===\r?\n/g).map((el, x) => {
      this._raw[x] = this._raw[x] || [];
      const newRaw_ss = el.split(/\r?\n--\r?\n/g).map((ss) => this.parseSlide(ss));
      if (newRaw_ss.every((ss) => !ss.html)) {
        xOffset++;
      }

      x -= xOffset;

      let yOffset = 0;
      return newRaw_ss.map((thisRaw, y) => {
        if (!thisRaw.html) {
          yOffset++;
          return;
        }

        y -= yOffset;

        let section = this.getSlide(x);
        let subSection = this.getSlide(x, y);

        if (!this._raw[x][y] || (this._raw[x][y] && this._raw[x][y].raw !== thisRaw.raw)) {
          const container = document.createElement("div");
          container.className = "container";
          container.innerHTML = thisRaw.html;

          if (section && subSection) {
            const oldContainers = subSection.getElementsByClassName("container");
            Array.from(oldContainers).forEach((el) => el.remove());
            subSection.appendChild(container);
          } else {
            subSection = document.createElement("section");
            subSection.append(container);

            if (section) {
              section.appendChild(subSection);
            } else {
              section = document.createElement("section");
              section.appendChild(subSection);
              document.querySelector(".reveal .slides")!.appendChild(section);
            }
          }

          Array.from(container.querySelectorAll("pre code:not(.hljs)")).forEach((el) => {
            if (window.hljs) {
              window.hljs.highlightBlock(el);
            }
          });
        }

        return thisRaw;
      }).filter((el) => el);
    }).filter((el) => el && el.length > 0) as ISlide[][];

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
    const m = /\/(\S+)\.css$/.exec(el.href);
    if (m) {
      return m[1];
    }

    return "";
  }

  set theme(t) {
    const el = document.getElementById("reveal-theme") as HTMLLinkElement;
    el.href = `${revealCdn}/css/theme/${t}.css`;
  }

  constructor(defaults: any) {
    window.revealMd = this;
    this.markdown = defaults.markdown;
    this.headers = defaults.headers;
  }

  update(raw: string) {
    const { data, content } = matter(raw);
    this.markdown = content;
    this.headers = data;
  }

  mdConvert(s: string) {
    return s.trim() ? mdConverter.makeHtml(s) : "";
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
        if (this._queue && this._queue.length > 0) {
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
    const id = hash(text);
    const raw = text;
    let type: "hidden" | "global" | "regular" = "regular";
    let html = text;
    let [firstLine, ...lines] = html.split("\n");
    const newType = firstLine.substr(3);
    if (newType === "hidden") {
      type = "hidden";
      return { html: "", raw, id, type };
    } else if (newType === "global") {
      type = "global";
    }

    html = html.replace(/(?:^|\n)\/\/ css=([A-Za-z0-9\-_]+\.css)(?:$|\n)/g, (p0, ref) => {
      const i = raw.indexOf(p0);
      const globalEl = document.getElementById("global") as HTMLDivElement;
      const className = `ref${i}`;

      let el = globalEl.querySelector(`style.ref.${className}`);
      if (!el) {
        el = document.createElement("style");
        el.classList.add("ref", className);
        globalEl.appendChild(el);
      }

      fetch(ref).then((r) => r.text()).then((content) => {
        if (type !== "global") {
          content = scopeCss(content, `#${id}`)
        }
        el!.innerHTML = content;
      })
      
      return "";
    })

    html = html.replace(/(?:^|\n)(\/\/ slide\n)?```(\S+)\n([^]+?)\n```(?:$|\n)/g, (p0, subtype, lang, content) => {
      if (type !== "global" && !subtype) {
        return p0;
      }

      if (lang === "css") {
        const globalEl = document.getElementById("global") as HTMLDivElement;
        if (type !== "global") {
          content = scopeCss(content, `#${id}`)
        }
        let el = globalEl.querySelector("style.main");
        if (!el) {
          el = document.createElement("style");
          el.className = "main";
          globalEl.appendChild(el);
        }
        el.innerHTML = content;
        return "";
      } else if (lang === "pre") {
        return h("pre", content).outerHTML;
      } else if (lang === "pug") {
        return this.pugConvert(html);
      }

      return p0;
    });

    if (type === "global") {
      return { html: "", raw, id, type };
    }

    return { html: h(`#${id}`, {
      innerHTML: this.mdConvert(html)
    }).outerHTML, raw, id, type };
  }

  getSlide(x: number, y?: number) {
    const s = document.querySelectorAll(".slides > section");
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

function hash(str: string) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.round(Math.abs(hash)).toString(36);
}

main();