import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useSettingsStore } from '../../store';

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
      overlayOpacity: 0.5,
      smoothScroll: true,
      steps: [
        {
          // Step 1: Welcome — no element, centered modal
          popover: {
            title: '👋 Chào mừng đến FactorySearch!',
            description:
              'Ứng dụng tra cứu đáp án hoạt động 100% offline ngay trên thiết bị của bạn. Hãy để chúng tôi giới thiệu các tính năng chính.',
          },
        },
        {
          element: '#search-bar-container',
          popover: {
            title: '🔍 Tìm kiếm câu hỏi',
            description:
              'Nhập từ khóa để tra cứu câu hỏi. Hỗ trợ tiếng Việt có dấu và không dấu. Hệ thống tự động tìm kiếm khi bạn dừng gõ.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#filter-panel-container',
          popover: {
            title: '📚 Bộ lọc môn học',
            description:
              'Lọc kết quả theo Môn học để thu hẹp phạm vi tìm kiếm. Hỗ trợ đa môn như Toán, Vật lý, Lập trình...',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#results-list',
          popover: {
            title: '📋 Danh sách kết quả',
            description:
              'Kết quả tra cứu hiển thị ở đây. Nhấn vào thẻ câu hỏi để xem đáp án chi tiết. Cuộn xuống để tải thêm.',
            side: 'top',
            align: 'center',
          },
        },
        {
          // "Xem nhanh đáp án" — target first card if exists, else center
          element: '.question-card',
          popover: {
            title: '✅ Xem nhanh đáp án',
            description:
              'Nhấn "Xem nhanh đáp án" ngay trên thẻ để mở đáp án ngay tại chỗ mà không cần vào modal.',
            side: 'top',
            align: 'center',
          },
        },
        {
          // Favorites — navbar link, safe to target
          element: '[href="/favorites"]',
          popover: {
            title: '💛 Danh sách yêu thích',
            description:
              'Nhấn biểu tượng tim trên thẻ câu hỏi để lưu vào Yêu thích. Vào đây để xem lại tất cả câu hỏi đã đánh dấu.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          // Settings — navbar link
          element: '[href="/settings"]',
          popover: {
            title: '⚙️ Cài đặt & Import',
            description:
              'Trong Cài đặt: thay đổi giao diện sáng/tối, import database mới từ JSON/SQLite, và backup dữ liệu.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          // Offline indicator
          element: '#offline-indicator',
          popover: {
            title: '📶 Hoạt động Offline',
            description:
              'Sau lần tải đầu tiên, ứng dụng hoạt động 100% không cần mạng. Trạng thái kết nối hiển thị tại đây.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          // PWA install or fallback to nav logo
          element: '#pwa-install-btn, #nav-logo',
          popover: {
            title: '📲 Cài như App thật',
            description:
              'Nhấn "Cài đặt App" để thêm FactorySearch vào màn hình chính (Android, iOS, Windows). Hoạt động như app native!',
            side: 'bottom',
            align: 'end',
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
