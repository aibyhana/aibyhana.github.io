---
layout: page
title: updates
permalink: /updates/
nav: true
nav_order: 2
---

<!-- Page Header Banner -->
<div class="page-header-banner">
  <img src="{{ 'assets/img/header-banner.jpg' | relative_url }}" alt="Header">
  <div class="page-header-overlay">
    <h1 class="page-header-title">Updates</h1>
    <p class="page-header-subtitle">Events, Talks & Professional Updates</p>
  </div>
</div>

<!-- Lightbox Overlay -->
<div class="lightbox-overlay" id="lightbox">
  <button class="lightbox-close" aria-label="Close"></button>
  <div class="lightbox-content">
    <img src="" alt="" id="lightbox-img">
  </div>
</div>

<ul class="updates-list">

<li class="update-item">
  <div class="update-date">December 2025</div>
  <span class="update-type announcement">Announcement</span>
  <div class="update-title">Stanford Ethics in Society Program</div>
  <div class="update-description">
    Completed seven weeks with the McCoy Family Center for Ethics in Society at Stanford, exploring AI bias, fairness trade-offs, and the gap between tech speed and policy speed. Grateful to Professors Rob Reich and Mehran Sahami, and experts including Ashlyn Jaeger, Riana Pfefferkorn, and cohort leader Jayrick Hayes.
  </div>
  <div class="update-images single-image">
    <img src="{{ 'assets/img/stanford_certificate.jpg' | relative_url }}" alt="Stanford Ethics Certificate" class="lightbox-trigger">
  </div>
</li>

<li class="update-item">
  <div class="update-date">October 2025</div>
  <span class="update-type event">Event</span>
  <div class="update-title">Zurich AI Safety Day 2025</div>
  <div class="update-description">
    Helped organize Zurich AI Safety Day 2025 at ETH Zürich as part of the targeted outreach team, connecting researchers and early-career talent with leaders from Anthropic, FAR.AI, Apollo Research, AI Security Institute, Palisade Research, MATS, Apart Research, BlueDot Impact, Simon Institute for Longterm Governance, Goodfire, and Centre for Future Generations.
  </div>
  <div class="update-images">
    <img src="{{ 'assets/img/zurichaisafety1.jpg' | relative_url }}" alt="Zurich AI Safety Day" class="lightbox-trigger">
    <img src="{{ 'assets/img/zurichaisafety2.jpg' | relative_url }}" alt="Zurich AI Safety Day" class="lightbox-trigger">
    <img src="{{ 'assets/img/zurichaisafety3.jpg' | relative_url }}" alt="Zurich AI Safety Day" class="lightbox-trigger">
  </div>
</li>

<li class="update-item">
  <div class="update-date">August 2025</div>
  <span class="update-type announcement">Announcement</span>
  <div class="update-title">Joined Capgemini AWS Team</div>
  <div class="update-description">
    Started working on scalable oversight and interpretability of retrieval-augmented systems at Capgemini's AWS Team in Munich.
  </div>
</li>

<li class="update-item">
  <div class="update-date">January 2025</div>
  <span class="update-type event">Research</span>
  <div class="update-title">Master's Thesis Completed</div>
  <div class="update-description">
    Completed my master's thesis at University Hospital Erlangen building diagnostic libraries for clinical CV failure modes.
  </div>
</li>

</ul>

---

*This page contains professional updates, events I've attended or spoken at, and career milestones. For longer-form writing and technical thoughts, check out the [blog](/blog/).*

<script>
document.addEventListener('DOMContentLoaded', function() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const triggers = document.querySelectorAll('.lightbox-trigger');

  triggers.forEach(img => {
    img.addEventListener('click', function() {
      lightboxImg.src = this.src;
      lightboxImg.alt = this.alt;
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  });

  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});
</script>
