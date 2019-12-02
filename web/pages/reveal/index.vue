<template lang="pug">
v-container.fill-height(fluid)
  v-row(no-gutters)
    v-col.col-sm-12.col-md-4
      v-treeview(:items="dree.children" item-key="path" :active.sync="clickedItems" activatable return-object open-on-click)
    v-col.hidden-sm-and-down.col-md-8
      iframe(:src="iframeUrl" frameborder="0")
</template>

<script lang="ts">
import { Vue, Component, Watch } from "nuxt-property-decorator";
import { Dree } from "dree";
import qs from "querystring";

@Component({
  async asyncData({ $axios }) {
    const dree = await $axios.$get("/api/dree/slides");
    return {
      dree
    };
  }
})
export default class RevealChooser extends Vue {
  clickedItems = [];
  iframeUrl = "about:blank";

  get currentItem() {
    return this.clickedItems[0];
  }

  @Watch("currentItem")
  onItemClicked(it: Dree) {
    if (it.extension === "md") {
      this.iframeUrl = `/build/reveal.html?${qs.stringify({
        filename: it.relativePath
      })}`;
    }
  }
}
</script>

<style lang="scss">
iframe {
  border-width: 0;
  border: none;
  width: 100%;
  height: calc(100vh - 180px);
}
</style>