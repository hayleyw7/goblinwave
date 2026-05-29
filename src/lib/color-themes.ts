export const COLOR_THEMES = [
  {
    id: "green",
    label: "Green",
    accent: "#4ade80",
    dark: "#166534",
    plateText: "#dcfce7",
    panelBg: "rgba(22, 101, 52, 0.22)",
    plateBg: "rgba(22, 101, 52, 0.92)",
    hpWrapBg: "rgba(22, 101, 52, 0.38)",
    divider: "rgba(74, 222, 128, 0.45)",
    buffBg: "rgba(22, 163, 74, 0.5)",
  },
  {
    id: "amber",
    label: "Gold",
    accent: "#facc15",
    dark: "#854d0e",
    plateText: "#fef9c3",
    panelBg: "rgba(133, 77, 14, 0.22)",
    plateBg: "rgba(133, 77, 14, 0.92)",
    hpWrapBg: "rgba(133, 77, 14, 0.38)",
    divider: "rgba(250, 204, 21, 0.45)",
    buffBg: "rgba(180, 83, 9, 0.5)",
  },
  {
    id: "rose",
    label: "Rose",
    accent: "#fb7185",
    dark: "#881337",
    plateText: "#ffe4e6",
    panelBg: "rgba(136, 19, 55, 0.22)",
    plateBg: "rgba(136, 19, 55, 0.92)",
    hpWrapBg: "rgba(136, 19, 55, 0.38)",
    divider: "rgba(251, 113, 133, 0.45)",
    buffBg: "rgba(190, 18, 60, 0.5)",
  },
  {
    id: "sky",
    label: "Sky",
    accent: "#38bdf8",
    dark: "#0c4a6e",
    plateText: "#e0f2fe",
    panelBg: "rgba(12, 74, 110, 0.22)",
    plateBg: "rgba(12, 74, 110, 0.92)",
    hpWrapBg: "rgba(12, 74, 110, 0.38)",
    divider: "rgba(56, 189, 248, 0.45)",
    buffBg: "rgba(3, 105, 161, 0.5)",
  },
  {
    id: "coral",
    label: "Coral",
    accent: "#fb923c",
    dark: "#9a3412",
    plateText: "#ffedd5",
    panelBg: "rgba(154, 52, 18, 0.22)",
    plateBg: "rgba(154, 52, 18, 0.92)",
    hpWrapBg: "rgba(154, 52, 18, 0.38)",
    divider: "rgba(251, 146, 60, 0.45)",
    buffBg: "rgba(194, 65, 12, 0.5)",
  },
  {
    id: "fuchsia",
    label: "Pink",
    accent: "#f472b6",
    dark: "#9d174d",
    plateText: "#fce7f3",
    panelBg: "rgba(157, 23, 77, 0.22)",
    plateBg: "rgba(157, 23, 77, 0.92)",
    hpWrapBg: "rgba(157, 23, 77, 0.38)",
    divider: "rgba(244, 114, 182, 0.45)",
    buffBg: "rgba(190, 24, 93, 0.5)",
  },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const COLOR_THEME_IDS: readonly ColorThemeId[] = COLOR_THEMES.map(
  (theme) => theme.id
);

export const DEFAULT_COLOR_THEME: ColorThemeId = "green";

export function isColorThemeId(value: string): value is ColorThemeId {
  return COLOR_THEMES.some((theme) => theme.id === value);
}

export function getColorTheme(id: ColorThemeId) {
  return COLOR_THEMES.find((theme) => theme.id === id) ?? COLOR_THEMES[0]!;
}
