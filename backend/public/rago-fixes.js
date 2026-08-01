/* rago-fixes.js — RaGo front-end enhancements (safe, additive; app.html is NOT modified)
   1) Stops the browser from auto-filling the email into the search box.
   2) Makes each category open its OWN full page (from the top) instead of only filtering.
   3) Forces detail/category pages to open scrolled to the top.
   Loaded automatically by server.js (injected right before </body>). */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function scrollTop() {
    try {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch (e) {}
  }

  ready(function () {
    /* ---------- 1) Kill email autofill in the search box ---------- */
    var q = document.getElementById("q");
    if (q) {
      q.setAttribute("type", "search");
      q.setAttribute("autocomplete", "off");
      q.setAttribute("autocorrect", "off");
      q.setAttribute("autocapitalize", "off");
      q.setAttribute("spellcheck", "false");
      q.setAttribute("name", "rago_search_" + Math.random().toString(36).slice(2));
      // Strongest trick: readonly until the user actually focuses the field.
      q.setAttribute("readonly", "readonly");
      q.addEventListener("focus", function () {
        this.removeAttribute("readonly");
      });
    }

    /* ---------- 2) Create the category page container ---------- */
    var main =
      document.querySelector("main.container") || document.querySelector("main");
    if (main && !document.getElementById("cat-view")) {
      var cv = document.createElement("div");
      cv.id = "cat-view";
      cv.className = "hidden";
      cv.innerHTML =
        '<section><button class="btn ghost sm" onclick="goHome()">&larr; Back</button>' +
        '<div id="cat-body" style="margin-top:14px"></div></section>';
      main.appendChild(cv);
    }

    /* ---------- 3) View manager that also knows about cat-view ---------- */
    function ragoShow(which) {
      ["public-view", "detail-view", "dash-view", "cat-view"].forEach(function (v) {
        var el = document.getElementById(v);
        if (el) el.classList.toggle("hidden", v !== which);
      });
      scrollTop();
    }

    // Wrap the original show() so any navigation also hides the category page
    // and always lands at the top of the page.
    var _origShow = window.show;
    window.show = function (id) {
      var cvv = document.getElementById("cat-view");
      if (cvv && id !== "cat-view") cvv.classList.add("hidden");
      var r = _origShow ? _origShow.call(window, id) : undefined;
      scrollTop();
      return r;
    };

    /* ---------- 4) Open a full page for a single category ---------- */
    window.openCat = async function (key) {
      try {
        var cats = window.ensureCats ? await window.ensureCats() : [];
        var cat = (cats || []).find(function (c) {
          return c.key === key;
        });
        var esc =
          window.esc ||
          function (s) {
            return String(s == null ? "" : s);
          };
        var money =
          window.money ||
          function (n) {
            return "$" + Number(n || 0).toLocaleString();
          };
        var label = cat ? (cat.labels && cat.labels.en) || cat.key : key;
        var hero = "img/cat-" + key + ".jpg";

        var list = [];
        try {
          list = await window.api("/api/services?cat=" + encodeURIComponent(key));
        } catch (e) {
          list = [];
        }

        var cards =
          list
            .map(function (s) {
              var img = s.cover || (s.images && s.images[0]) || "";
              return (
                '<div class="card" onclick="openDetail(' + s.id + ')">' +
                '<div class="img" style="background-image:url(\'' + img + "')\">" +
                (s.featured ? '<span class="feat">Featured</span>' : "") +
                '</div><div class="body"><div class="t">' + esc(s.title) + "</div>" +
                '<div class="loc">&#128205; ' + esc(s.location) + "</div>" +
                '<div class="meta"><span class="star">&#9733; ' + s.rating +
                ' <span class="muted">(' + s.reviews_count + ")</span></span>" +
                '<span class="price">' + money(s.price) +
                ' <small>/ ' + esc(s.duration || "") + "</small></span></div></div></div>"
              );
            })
            .join("") || '<p class="muted">No options in this service yet.</p>';

        var body = document.getElementById("cat-body");
        if (body) {
          body.innerHTML =
            '<div class="hero" style="background-image:url(\'' + hero + "')\"></div>" +
            '<div class="eyebrow">Service</div>' +
            "<h2>" + esc(label) + "</h2>" +
            '<p class="muted">' + list.length + " option" +
            (list.length !== 1 ? "s" : "") + " available</p>" +
            '<div class="grid" style="margin-top:16px">' + cards + "</div>";
        }
        ragoShow("cat-view");
      } catch (e) {
        if (typeof _origPickCat === "function") {
          ragoShow("public-view");
          _origPickCat.call(window, key);
        }
      }
    };

    /* ---------- 5) Make category clicks open the full page ---------- */
    var _origPickCat = window.pickCat;
    window.pickCat = function (k) {
      if (!k) {
        // "All Services" keeps the original filter behaviour on the home view.
        ragoShow("public-view");
        if (typeof _origPickCat === "function") return _origPickCat.call(window, "");
        return;
      }
      return window.openCat(k);
    };
  });
})();
