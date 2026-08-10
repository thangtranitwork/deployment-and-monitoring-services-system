import React, { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  fetchSimpleIcons,
  ICloud,
  renderSimpleIcon,
  SimpleIcon,
} from "react-icon-cloud";

export const cloudProps: Omit<ICloud, "children"> = {
  containerProps: {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
    },
  },
  options: {
    reverse: true,
    depth: 1,
    wheelZoom: false,
    imageScale: 2,
    activeCursor: "default",
    tooltip: "native",
    initial: [0.1, -0.1],
    clickToFront: 500,
    tooltipDelay: 0,
    outlineColour: "#0000",
    maxSpeed: 0.04,
    minSpeed: 0.02,
  },
};

export const renderCustomIcon = (icon: SimpleIcon, theme: string) => {
  const bgHex = "#0000";
  const fallbackHex = theme === "light" ? "#10b981" : "#34d399";
  const minContrastRatio = theme === "dark" ? 2 : 1.2;

  return renderSimpleIcon({
    icon,
    bgHex,
    fallbackHex,
    minContrastRatio,
    size: 42,
    aProps: {
      href: undefined,
      target: undefined,
      rel: undefined,
      onClick: (e: any) => e.preventDefault(),
    },
  });
};

const DEFAULT_SLUGS = [
  "typescript",
  "javascript",
  "go",
  "docker",
  "git",
  "github",
  "nginx",
  "react",
  "tailwindcss",
  "vite",
  "nodedotjs",
  "mysql",
  "linux",
  "bash",
  "openvpn",
  "html5",
  "css3",
  "postgresql",
  "redis",
  "visualstudiocode",
  "kubernetes"
];

type IconData = Awaited<ReturnType<typeof fetchSimpleIcons>>;
let globalCachedIconData: IconData | null = null;
let globalRenderedIconsCache: any = null;

export const IconCloud = React.memo(function IconCloudComponent({ iconSlugs }: { iconSlugs?: string[] }) {
  const [data, setData] = useState<IconData | null>(globalCachedIconData);

  useEffect(() => {
    if (globalCachedIconData) return;
    fetchSimpleIcons({ slugs: DEFAULT_SLUGS }).then((res) => {
      globalCachedIconData = res;
      if (globalCachedIconData && !globalRenderedIconsCache) {
        globalRenderedIconsCache = Object.values(globalCachedIconData.simpleIcons).map((icon) =>
          renderCustomIcon(icon, "dark")
        );
      }
      setData(res);
    }).catch(() => {});
  }, []);

  const renderedIcons = useMemo(() => {
    if (globalRenderedIconsCache) return globalRenderedIconsCache;
    if (!data) return null;
    globalRenderedIconsCache = Object.values(data.simpleIcons).map((icon) =>
      renderCustomIcon(icon, "dark")
    );
    return globalRenderedIconsCache;
  }, [data]);

  if (!renderedIcons) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    // @ts-ignore
    <Cloud {...cloudProps}>
      {renderedIcons}
    </Cloud>
  );
});
