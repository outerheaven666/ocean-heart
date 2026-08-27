import { useEffect } from "react";

// 动态浏览器标签标题:进入页面设置为「xxx · 海洋之心」,离开恢复默认
export function useTitle(title?: string | null) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = `${title} · 海洋之心`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
