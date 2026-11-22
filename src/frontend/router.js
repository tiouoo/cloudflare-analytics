import { createRouter, createWebHistory } from "vue-router";

const pages = [
  {
    path: "",
    name: "home",
    component: () => import("./views/HomeView.vue"),
    meta: { title: "Cloudflare Analytics" },
  },
  {
    path: ":pathMatch(.*)*",
    name: "not-found",
    component: () => import("./views/NotFoundView.vue"),
    meta: { title: "404" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./MainView.vue"), children: pages },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to, _from, failure) => {
  if (!failure) document.title = to.meta.title;
});

export default router;
