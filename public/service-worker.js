const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/styles.css",
    "./index.js",
    "/db.js",
    "./manifest.webmanifest",
    "/icons/icon192.png",
    "/icons/icon512.png",
  ];
  const CACHE_NAME = "static-cache-v3";
  const DATA_CACHE_NAME = "data-cache-v1";
  
  self.addEventListener("install", function (evt) {
    evt.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log("Your files were pre-cached successfully!");
        return cache.addAll(FILES_TO_CACHE);
      })
    );
    self.skipWaiting();
  });
  self.addEventListener("activate", function (evt) {
    evt.waitUntil(
      caches.keys().then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              console.log("Removing old cache data", key);
              return caches.delete(key);
            }
          })
        );
      })
    );
    self.clients.claim();
  });

  // Fetch
  self.addEventListener("fetch", evt => {
    // Caches GETs only
    if (
      evt.request.method !== "GET" ||
      !evt.request.url.startsWith(self.location.origin)
    ) {
      evt.respondWith(fetch(evt.request));
      return;
    }
  
  // Handle GET requests for data from /api routes
  if (evt.request.url.includes("/api/transaction")) {
    // Cache responses
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(evt.request)
          .then(response => {
            // If valid response, clone and cache
            if (response.status === 200) {
            cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch((err) => {
            // If request fails, pull from cache
            return cache.match(evt.request);
          });
        })
        .catch((err) => console.log(err))
    );
    return;
  }
  
  evt.respondWith(
    caches.match(evt.request).then(function (response) {
      return response || fetch(evt.request);
    })
  );
});