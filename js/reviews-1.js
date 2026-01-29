// js/reviews.js
// Reviews page behavior: sort, load more, submit, helpful/report
(function () {
  'use strict';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (html) e.innerHTML = html;
    return e;
  }

  // Demo data to simulate server-loaded reviews
  var demoReviews = [
    { id: 'r-101', name: 'Jane', rating: 5, text: 'Great quality and fast delivery.', date: '2026-01-05', helpful: 3, avatar: 'JS' },
    { id: 'r-102', name: 'Kemi', rating: 5, text: 'Lovely fabric and perfect fit.', date: '2026-01-02', helpful: 5, avatar: 'KM' },
    { id: 'r-103', name: 'Tunde', rating: 4, text: 'Nice dress but color slightly different in person.', date: '2025-12-28', helpful: 2, avatar: 'TD' },
    { id: 'r-104', name: 'Aisha', rating: 5, text: 'I wear it to work and weekends — very versatile.', date: '2025-12-20', helpful: 6, avatar: 'AI' },
    { id: 'r-105', name: 'Paul', rating: 3, text: 'Good but stitching could be better.', date: '2025-12-10', helpful: 1, avatar: 'PL' }
  ];
  var demoIndex = 0;

  var reviewsList = qs('.reviews-list');
  var loadMoreBtn = qs('#reviews-load-more');
  var sortSelect = qs('#review-sort');
  var reviewForm = qs('#review-form');
  var reviewMsg = qs('#review-form-msg');
  var reviewsCountEl = qs('#reviews-count');

  function formatDateISO(d) { return new Date(d).toISOString().slice(0,10); }
  function formatDateReadable(d) { return new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }); }
  function safeText(s) { var div = document.createElement('div'); div.textContent = s || ''; return div.innerHTML; }

  function createReviewElement(data) {
    var article = el('article', { class: 'review-item card mb-3', role: 'listitem', 'aria-labelledby': 'rev-' + (data.id || Date.now()) + '-title' });
    var body = el('div', { class: 'card-body d-flex gap-3' });

    var avatar = el('div', { class: 'review-avatar', 'aria-hidden': 'true' }, safeText(data.avatar || (data.name || 'U').slice(0,2).toUpperCase()));
    var content = el('div', { class: 'review-content' });

    var header = el('div', { class: 'review-header d-flex align-items-start justify-content-between' });
    var left = el('div');
    var title = el('h4', { id: 'rev-' + (data.id || Date.now()) + '-title', class: 'mb-0' }, safeText(data.text ? data.text.substring(0,60) : 'Review'));
    title.style.fontSize = '1rem';
    title.style.fontWeight = '800';
    var meta = el('div', { class: 'small text-muted' }, 'by ' + safeText(data.name || 'Anonymous') + ' · ' + formatDateReadable(data.date || new Date()));
    left.appendChild(title);
    left.appendChild(meta);

    var rating = el('div', { class: 'rating', 'aria-hidden': 'true' }, '★'.repeat(Math.max(0, Math.min(5, data.rating || 0))) + (data.rating < 5 ? '☆'.repeat(5 - (data.rating || 0)) : ''));

    header.appendChild(left);
    header.appendChild(rating);

    var para = el('p', { class: 'mb-2 text-muted small' }, safeText(data.text || ''));

    var actionsRow = el('div', { class: 'review-actions small text-muted d-flex gap-3' });
    var helpfulBtn = el('button', { class: 'btn btn-link p-0 helpful-btn', type: 'button', 'data-id': data.id || '' }, 'Helpful · ');
    var helpCount = el('span', { class: 'help-count' }, String(data.helpful || 0));
    helpfulBtn.appendChild(helpCount);
    var reportBtn = el('button', { class: 'btn btn-link p-0 report-btn', type: 'button', 'data-id': data.id || '' }, 'Report');

    actionsRow.appendChild(helpfulBtn);
    actionsRow.appendChild(reportBtn);

    content.appendChild(header);
    content.appendChild(para);
    content.appendChild(actionsRow);

    body.appendChild(avatar);
    body.appendChild(content);
    article.appendChild(body);

    article.dataset.rating = String(data.rating || 0);
    article.dataset.date = formatDateISO(data.date || new Date());
    article.dataset.helpful = String(data.helpful || 0);
    article.dataset.id = data.id || '';

    return article;
  }

  // Helpful state in localStorage
  var STORAGE_KEY = 'jk_reviews_helpful_v1';
  function getHelpfulState() { try { var raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; } }
  function setHelpfulState(obj) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) {} }

  function toggleHelpful(button) {
    if (!button) return;
    var id = button.getAttribute('data-id') || '';
    if (!id) return;
    var state = getHelpfulState();
    var already = !!state[id];
    var countEl = button.querySelector('.help-count');
    var current = parseInt(countEl.textContent || '0', 10) || 0;
    var art = button.closest('.review-item');

    if (already) {
      state[id] = false;
      countEl.textContent = String(Math.max(0, current - 1));
      button.setAttribute('aria-pressed', 'false');
      button.classList.remove('text-primary');
      if (art) art.dataset.helpful = String(Math.max(0, parseInt(art.dataset.helpful || '0', 10) - 1));
    } else {
      state[id] = true;
      countEl.textContent = String(current + 1);
      button.setAttribute('aria-pressed', 'true');
      button.classList.add('text-primary');
      if (art) art.dataset.helpful = String((parseInt(art.dataset.helpful || '0', 10) + 1));
    }
    setHelpfulState(state);
  }

  function markReported(button) {
    if (!button) return;
    var art = button.closest('.review-item');
    if (!art) return;
    button.textContent = 'Reported';
    button.disabled = true;
    button.classList.add('text-danger');
    art.style.opacity = '0.95';
  }

  function sortReviews(mode) {
    var items = qsa('.reviews-list .review-item');
    if (!items.length) return;
    var mapped = items.map(function (it) {
      return {
        el: it,
        date: new Date(it.dataset.date || '').getTime() || 0,
        rating: parseInt(it.dataset.rating || '0', 10) || 0,
        helpful: parseInt(it.dataset.helpful || '0', 10) || 0
      };
    });

    if (mode === 'most-recent') mapped.sort(function (a,b){ return b.date - a.date; });
    else if (mode === 'highest') mapped.sort(function (a,b){ return b.rating - a.rating || b.date - a.date; });
    else if (mode === 'lowest') mapped.sort(function (a,b){ return a.rating - b.rating || b.date - a.date; });
    else if (mode === 'most-helpful') mapped.sort(function (a,b){ return b.helpful - a.helpful || b.date - a.date; });

    var parent = qs('.reviews-list');
    var frag = document.createDocumentFragment();
    mapped.forEach(function (m) { frag.appendChild(m.el); });
    parent.appendChild(frag);
  }

  function incrementReviewsCount(by) {
    by = by || 1;
    if (!reviewsCountEl) return;
    var n = parseInt(reviewsCountEl.textContent.replace(/[^\d]/g, ''), 10) || 0;
    n += by;
    reviewsCountEl.textContent = String(n);
  }

  function loadMoreReviews(count) {
    count = count || 3;
    var added = 0;
    while (added < count && demoIndex < demoReviews.length) {
      var data = demoReviews[demoIndex++];
      var node = createReviewElement(data);
      var placeholder = qs('#more-reviews-placeholder');
      if (placeholder && placeholder.parentNode) placeholder.parentNode.insertBefore(node, placeholder);
      else reviewsList.appendChild(node);
      added++;
      incrementReviewsCount(1);
    }
    return added;
  }

  function validateEmail(email) { return /^\S+@\S+\.\S+$/.test(email); }

  function showFormMessage(msg, ok) {
    if (!reviewMsg) return;
    reviewMsg.style.display = 'block';
    reviewMsg.textContent = msg;
    reviewMsg.classList.remove('text-danger','text-success');
    reviewMsg.classList.add(ok ? 'text-success' : 'text-danger');
    setTimeout(function () { reviewMsg.style.display = 'none'; }, 2200);
  }

  function handleFormSubmit(ev) {
    ev.preventDefault();
    if (!reviewForm) return;
    var name = (reviewForm.querySelector('[name="name"]').value || '').trim();
    var email = (reviewForm.querySelector('[name="email"]').value || '').trim();
    var rating = (reviewForm.querySelector('[name="rating"]').value || '').trim();
    var text = (reviewForm.querySelector('[name="review"]').value || '').trim();

    if (!name || !email || !rating) { showFormMessage('Please complete name, email and rating.', false); return; }
    if (!validateEmail(email)) { showFormMessage('Please enter a valid email address.', false); return; }

    var newId = 'r-local-' + Date.now();
    var newReview = { id: newId, name: name, rating: parseInt(rating,10), text: text, date: new Date().toISOString(), helpful: 0, avatar: (name.split(' ').map(function(s){return s[0];}).slice(0,2).join('') || 'U').toUpperCase() };
    var node = createReviewElement(newReview);
    if (reviewsList) reviewsList.insertBefore(node, reviewsList.firstChild);
    incrementReviewsCount(1);
    showFormMessage('Thanks — your review was submitted.', true);
    reviewForm.reset();
  }

  // Delegated events
  document.addEventListener('click', function (e) {
    var hb = e.target.closest && e.target.closest('.helpful-btn');
    if (hb) { e.preventDefault(); toggleHelpful(hb); return; }
    var rb = e.target.closest && e.target.closest('.report-btn');
    if (rb) { e.preventDefault(); markReported(rb); return; }
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      loadMoreBtn.disabled = true;
      var original = loadMoreBtn.textContent;
      loadMoreBtn.textContent = 'Loading...';
      setTimeout(function () {
        var added = loadMoreReviews(3);
        if (added === 0) { loadMoreBtn.textContent = 'No more reviews'; loadMoreBtn.disabled = true; }
        else { loadMoreBtn.textContent = original; loadMoreBtn.disabled = false; }
      }, 700);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', function () { sortReviews(sortSelect.value || 'most-recent'); });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', handleFormSubmit);
  }

  // Hydrate helpful state
  (function hydrateHelpful() {
    var state = getHelpfulState();
    qsa('.helpful-btn').forEach(function (btn) {
      var id = btn.getAttribute('data-id') || '';
      if (state[id]) { btn.setAttribute('aria-pressed','true'); btn.classList.add('text-primary'); }
      else { btn.setAttribute('aria-pressed','false'); }
    });
  })();

  // Initial sort and preload if empty
  if (sortSelect) sortSelect.value = sortSelect.value || 'most-recent';
  sortReviews(sortSelect ? sortSelect.value : 'most-recent');

  (function preload() {
    var existing = qsa('.reviews-list .review-item');
    if (!existing.length) loadMoreReviews(2);
  })();

  // Expose for debugging
  window.__reviews = { loadMoreReviews: loadMoreReviews, sortReviews: sortReviews, toggleHelpful: toggleHelpful };

})();
