const navLinks = document.querySelectorAll('.nav-link');
const heroCopy = document.querySelector('.hero-copy');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let heroTicking = false;

function setActiveLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = href === currentPath || (href === 'index.html' && currentPath === '');
    link.classList.toggle('active', isActive);
  });
}

function updateHeroText() {
  if (!heroCopy) return;

  if (prefersReducedMotion) {
    heroCopy.style.transform = '';
    heroCopy.style.opacity = '';
    return;
  }

  const scroll = window.scrollY;
  const maxScroll = window.innerHeight * 0.45;
  const progress = Math.min(Math.max(scroll / maxScroll, 0), 1);
  const scale = 1 - progress * 0.35;
  const opacity = Math.max(0, 1 - progress * 1.2);
  const translateY = progress * 18;

  heroCopy.style.transform = `translateY(-${translateY}px) scale(${scale})`;
  heroCopy.style.opacity = opacity;
}

function requestHeroUpdate() {
  if (!heroCopy || heroTicking) return;

  heroTicking = true;
  requestAnimationFrame(() => {
    updateHeroText();
    heroTicking = false;
  });
}

window.addEventListener('scroll', requestHeroUpdate, { passive: true });
window.addEventListener('resize', () => {
  requestHeroUpdate();
});
setActiveLink();
updateHeroText();

navLinks.forEach((link) => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('#')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
});

// 横向预览滚动：当鼠标移到容器左右侧时自动横向滚动（支持多个实例）
(function initAllPreviewScrollers(){
  const wrappers = document.querySelectorAll('.preview-wrapper');
  
  wrappers.forEach(wrapper => {
    const container = wrapper.querySelector('.preview-scroller');
    if (!container) return;

    let rafId = null;
    let velocity = 0; // px per frame
    const maxSpeed = 10; // maximum px per frame
    const deadZone = 0.12; // 中间不触发的区域比例（缩小触发区，左右各 12%）

    function update() {
      if (Math.abs(velocity) > 0.1) {
        container.scrollLeft += velocity;
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    }

    function onPointerMove(e) {
      const rect = wrapper.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
      const x = clientX - rect.left;
      const pct = x / rect.width;

      if (pct < 0 || pct > 1) {
        velocity = 0;
        return;
      }

      if (pct < deadZone) {
        const factor = (deadZone - pct) / deadZone; // 0..1
        velocity = -Math.round(maxSpeed * factor);
      } else if (pct > (1 - deadZone)) {
        const factor = (pct - (1 - deadZone)) / deadZone;
        velocity = Math.round(maxSpeed * factor);
      } else {
        velocity = 0;
      }

      if (!rafId && Math.abs(velocity) > 0.1) update();
    }

    wrapper.addEventListener('mousemove', onPointerMove);
    wrapper.addEventListener('mouseleave', () => { velocity = 0; });
    wrapper.addEventListener('touchmove', onPointerMove, { passive: true });
    wrapper.addEventListener('touchend', () => { velocity = 0; });

    // 箭头点击：平滑滚动半个容器宽度
    const leftBtn = wrapper.querySelector('.preview-arrow-left');
    const rightBtn = wrapper.querySelector('.preview-arrow-right');
    function scrollByAmount(amount) {
      container.scrollBy({ left: amount, behavior: 'smooth' });
    }
    if (leftBtn) leftBtn.addEventListener('click', () => scrollByAmount(-Math.max(container.clientWidth * 0.5, 200)));
    if (rightBtn) rightBtn.addEventListener('click', () => scrollByAmount(Math.max(container.clientWidth * 0.5, 200)));
  });
})();
 
// 动态计算并设置次级页签到顶部的偏移，避免与固定的 topbar 重叠
function adjustProjectTabsOffset() {
  const topbar = document.querySelector('.topbar');
  const tabs = document.querySelector('.project-tabs');
  if (!tabs) return;

  let topPx = 40; // fallback
  if (topbar) {
    const rect = topbar.getBoundingClientRect();
    // rect.bottom 是相对于视口的底部位置，添加 8px 间距
    topPx = Math.round(rect.bottom + 8);
  }
  document.documentElement.style.setProperty('--project-tabs-top', topPx + 'px');
}

window.addEventListener('resize', adjustProjectTabsOffset);
window.addEventListener('load', adjustProjectTabsOffset);
// 在 DOMContentLoaded 之后立即运行一次
window.addEventListener('DOMContentLoaded', adjustProjectTabsOffset);


// 页面通用：回到顶部按钮处理与项目标签高亮
(function initBackToTopAndTabs(){
  // 回到顶部
  const back = document.getElementById('back-to-top');
  if (back) {
    back.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // 项目主图缩略图点击回到顶部
  const mainImageThumb = document.querySelector('.main-image-thumb');
  if (mainImageThumb) {
    mainImageThumb.addEventListener('click', () => { 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    });
    mainImageThumb.style.cursor = 'pointer';
  }

  // 二级页签高亮（根据文件名匹配）
  const tabLinks = document.querySelectorAll('.project-tabs a');
  if (tabLinks.length) {
    const current = window.location.pathname.split('/').pop();
    tabLinks.forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === current || (href === 'nutriai.html' && current === ''));
    });
  }
})();

// 画廊缩略图：点击缩略图跳转到对应大图并高亮
// 增强版：自动识别详情页签（品牌/logo/产品/UI）中的图片内容
(function initGalleryPreview(){
  const previewTrack = document.querySelector('.gallery-preview');
  if (!previewTrack) return;

  // 获取当前激活的页签面板
  function getActivePanel() {
    const activeBtn = document.querySelector('.detail-tabs .tab-btn.active');
    if (!activeBtn) return null;
    const panelName = activeBtn.getAttribute('data-tab');
    return document.querySelector(`.tab-panel[data-panel="${panelName}"]`);
  }

  // 从指定元素中提取所有图片
  function extractImagesFromElement(element) {
    if (!element) return [];
    return Array.from(element.querySelectorAll('img'));
  }

  // 从项目主图库中提取图片（用于默认情况）
  function getMainGalleryImages() {
    const gallery = document.querySelector('.project-gallery');
    if (!gallery) return [];
    return Array.from(gallery.querySelectorAll('img'));
  }

  // 构建缩略图
  function buildThumbnails(images, source = 'main') {
    // clear preview
    previewTrack.innerHTML = '';

    if (images.length === 0) {
      // 如果没有图片，隐藏预览轨道
      previewTrack.style.display = 'none';
      return;
    }

    previewTrack.style.display = 'flex';

    images.forEach((img, idx) => {
      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.loading = 'lazy';
      thumb.src = img.getAttribute('src');
      thumb.alt = img.getAttribute('alt') || `thumbnail-${idx + 1}`;
      thumb.dataset.source = source;
      
      // click -> scroll to corresponding image
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        const targetImg = images[idx] || images[0];
        if (targetImg) {
          targetImg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // active class
        Array.from(previewTrack.querySelectorAll('.thumb')).forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        // center thumb in preview
        const rect = thumb.getBoundingClientRect();
        const containerRect = previewTrack.getBoundingClientRect();
        const style = getComputedStyle(previewTrack);
        const isColumn = style.flexDirection && style.flexDirection.indexOf('column') === 0;
        if (isColumn) {
          const offsetY = (rect.top + rect.bottom) / 2 - (containerRect.top + containerRect.bottom) / 2;
          previewTrack.scrollBy({ top: offsetY, behavior: 'smooth' });
        } else {
          const offsetX = (rect.left + rect.right) / 2 - (containerRect.left + containerRect.right) / 2;
          previewTrack.scrollBy({ left: offsetX, behavior: 'smooth' });
        }
      });

      previewTrack.appendChild(thumb);
    });

    // set first active by default
    const first = previewTrack.querySelector('.thumb');
    if (first) { 
      previewTrack.querySelectorAll('.thumb').forEach(t => t.classList.remove('active')); 
      first.classList.add('active'); 
    }
  }

  // 更新缩略图（根据当前激活的页签）
  function updateThumbnails() {
    const activePanel = getActivePanel();
    
    if (activePanel) {
      // 如果有激活的页签面板，从中提取图片
      const panelImages = extractImagesFromElement(activePanel);
      if (panelImages.length > 0) {
        buildThumbnails(panelImages, 'panel');
        return;
      }
    }
    
    // 否则使用主图库的图片
    const mainImages = getMainGalleryImages();
    buildThumbnails(mainImages, 'main');
  }

  // 初始构建
  updateThumbnails();

  // 监听页签切换
  const detailTabs = document.querySelector('.detail-tabs');
  if (detailTabs) {
    const tabButtons = detailTabs.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // 延迟执行，等待页签切换完成
        setTimeout(updateThumbnails, 50);
      });
    });
  }

  // 监听主图库变化
  const gallery = document.querySelector('.project-gallery');
  if (gallery) {
    const mo = new MutationObserver(() => {
      updateThumbnails();
    });
    mo.observe(gallery, { childList: true, subtree: true, attributes: true });
  }

  // 监听页签面板内容变化
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => {
    const mo = new MutationObserver(() => {
      updateThumbnails();
    });
    mo.observe(panel, { childList: true, subtree: true, attributes: true });
  });
})();

// 项目详情页：详情页签切换（用于 xung 等页面）
function initDetailTabs() {
  const container = document.querySelector('.detail-tabs');
  if (!container || container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';

  const buttons = container.querySelectorAll('.tab-btn');
  const panels = container.querySelectorAll('.tab-panel');

  function activate(tabName) {
    buttons.forEach(b => {
      const is = b.getAttribute('data-tab') === tabName;
      b.classList.toggle('active', is);
      b.setAttribute('aria-selected', is ? 'true' : 'false');
    });
    panels.forEach(p => {
      if (p.getAttribute('data-panel') === tabName) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  buttons.forEach(b => {
    b.addEventListener('click', (e) => {
      const name = b.getAttribute('data-tab');
      activate(name);
    });
  });

  container.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    const currentIndex = Array.from(buttons).findIndex(button => button.classList.contains('active'));
    let nextIndex = currentIndex;
    if (event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
    if (event.key === 'ArrowRight') nextIndex = Math.min(buttons.length - 1, currentIndex + 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = buttons.length - 1;

    const nextButton = buttons[nextIndex];
    if (!nextButton) return;

    event.preventDefault();
    nextButton.focus();
    activate(nextButton.getAttribute('data-tab'));
  });
}

window.addEventListener('DOMContentLoaded', initDetailTabs);
