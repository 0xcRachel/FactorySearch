import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSettingsStore } from '../../store';

/**
 * Clamp the driver.js popover so it never overflows the viewport.
 * Called after every popover render.
 */
function clampPopover() {
  const el = document.querySelector('.driver-popover') as HTMLElement | null;
  if (!el) return;

  // Let the browser paint first so getBoundingClientRect is accurate
  requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    const pad = 10; // px gap from screen edge
    const vw = window.innerWidth;

    // Too far right → shift left
    if (rect.right > vw - pad) {
      el.style.left = `${parseFloat(el.style.left || '0') - (rect.right - (vw - pad))}px`;
    }
    // Too far left → shift right
    if (rect.left < pad) {
      el.style.left = `${pad}px`;
    }
  });
}

export function useOnboarding() {
  const { hasSeenOnboarding, setHasSeenOnboarding } = useSettingsStore();

  const startTour = () => {
    const driverObj = driver({
      popoverClass: 'claude-popover',
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Tiếp theo →',
      prevBtnText: '← Quay lại',
      doneBtnText: 'Hoàn tất ✓',
      allowClose: true,
      overlayOpacity: 0.45,
      smoothScroll: true,
      onPopoverRender: (_popover, _opts) => {
        clampPopover();
      },
      steps: [
        // ── Step 1: Welcome (no element → driver.js tự căn giữa)
        {
          popover: {
            title: 'Chào mừng đến FactorySearch!',
            description:
              'Ứng dụng tra cứu đáp án hoạt động 100% offline ngay trên thiết bị của bạn, Sản phẩm được phát triển bởi 0xcRachel. Hãy để chúng tôi giới thiệu các tính năng chính.',
          },
        },

        // ── Step 2: Search bar
        {
          element: '#search-bar-container',
          popover: {
            title: 'Tìm kiếm câu hỏi',
            description:
              'Nhập từ khóa để tra cứu. Hỗ trợ tiếng Việt có dấu và không dấu — tìm kiếm ngay khi bạn gõ.',
            side: 'bottom',
            align: 'center',
          },
        },

        // ── Step 3: Filter panel
        {
          element: '#filter-panel-container',
          popover: {
            title: 'Bộ lọc môn học',
            description:
              'Lọc kết quả theo môn học để thu hẹp phạm vi. Hỗ trợ Toán, Vật lý, Lập trình...',
            side: 'bottom',
            align: 'center',
          },
        },

        // ── Step 4: Results list
        {
          element: '#results-list',
          popover: {
            title: 'Danh sách kết quả',
            description:
              'Kết quả hiển thị ở đây. Nhấn thẻ để xem đáp án chi tiết, cuộn xuống để tải thêm.',
            side: 'top',
            align: 'center',
          },
        },

        // ── Step 5: Quick-view answer on first card
        {
          element: '.question-card',
          popover: {
            title: 'Xem nhanh đáp án',
            description:
              'Nhấn "Xem nhanh đáp án" để mở đáp án ngay tại thẻ — không cần vào modal chi tiết.',
            side: 'top',
            align: 'center',
          },
        },

        // ── Step 6: Favorites nav link
        //    align:'start' pushes the popover right so it won't clip left edge on mobile
        {
          element: '[href="/favorites"]',
          popover: {
            title: 'Danh sách yêu thích',
            description:
              'Nhấn biểu tượng tim trên bất kỳ thẻ câu hỏi nào để lưu vào Yêu thích. Xem lại mọi lúc — kể cả offline.',
            side: 'bottom',
            align: 'center',
          },
        },

        // ── Step 7: Settings nav link
        {
          element: '[href="/settings"]',
          popover: {
            title: 'Cài đặt & Import',
            description:
              'Trong Cài đặt: đổi giao diện sáng/tối, import database mới từ JSON/SQLite, và backup dữ liệu.',
            side: 'bottom',
            align: 'center',
          },
        },

        // ── Step 8: Offline / Online indicator badge
        {
          element: '#offline-indicator',
          popover: {
            title: 'Hoạt động Offline',
            description:
              'Sau lần tải đầu, app hoạt động 100% không cần mạng. Trạng thái kết nối hiển thị tại đây.',
            side: 'bottom',
            align: 'end',
          },
        },

        // ── Step 9: PWA install (hiển thị khi có, fallback logo)
        {
          element: '#pwa-install-btn, #nav-logo',
          popover: {
            title: 'Cài như App thật',
            description:
              'Nhấn "Cài đặt App" để thêm FactorySearch vào màn hình chính (Android / iOS / Windows) — hoạt động như app native!',
            side: 'bottom',
            align: 'end',
          },
        },

        // ── Step 10: Done
        {
          popover: {
            title: 'Bạn đã sẵn sàng!',
            description:
              'Bắt đầu tra cứu ngay bây giờ. Nhập câu hỏi vào ô tìm kiếm và khám phá đáp án tức thì!',
          },
        },
      ],

      onDestroyStarted: () => {
        setHasSeenOnboarding(true);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSeenOnboarding]);

  return { startTour };
}
