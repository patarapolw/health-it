<template lang="pug">
v-container.fill-height
  v-row(no-gutters)
    v-col(cols="4")
      v-treeview(:items="treeview")
    v-col
      iframe(:src="iframeUrl")
</template>