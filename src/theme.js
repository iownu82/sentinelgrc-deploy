import { createContext, useContext } from "react";

export const ThemeContext = createContext("dark");
export const useTheme = () => useContext(ThemeContext);

const DARK = {
  bg:"#03080E", panel:"#060D16", panelAlt:"#08111C", panel2:"#08111C",
  border:"#0D1E2E", borderMd:"#1A3050",
  // ── Text — boosted contrast throughout ──
  text:"#C8D8E8",        // main body — already good
  textDim:"#9AB8D0",     // secondary — was #7A9AB8, now brighter
  dim:"#9AB8D0",
  textMute:"#6A8FAA",    // labels/captions — was #3A5570, now much more visible
  mute:"#6A8FAA",
  white:"#F0F8FF",       // headings/titles
  input:"#040C16", inputBorder:"#1A3A5C",
  rowA:"#050C14", rowB:"#040A12", scroll:"#1A3A5C", headerBg:"#02060C",
  teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444",
  orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF",
};

const LIGHT = {
  bg:"#EEF3F8", panel:"#FFFFFF", panelAlt:"#F4F8FC", panel2:"#F4F8FC",
  border:"#C0D0E0", borderMd:"#A0B8D0",
  // ── Text — all dark for readability on white ──
  text:"#0A1828",        // near-black main text
  textDim:"#1E3450",     // was #2A4060 — even darker secondary
  dim:"#1E3450",
  textMute:"#3A5878",    // was #4A6080 — much darker labels/captions
  mute:"#3A5878",
  white:"#060E1A",       // heading color in light mode — near-black
  input:"#FFFFFF", inputBorder:"#98B8D0",
  rowA:"#FFFFFF", rowB:"#F4F8FC", scroll:"#98B8D0", headerBg:"#FFFFFF",
  teal:"#005C48", blue:"#003E9A", red:"#A01818",
  orange:"#8A3800", gold:"#6A4C00", green:"#004C2C", purple:"#461E8A",
};

export const THEMES = { dark: DARK, light: LIGHT };
export const useColors = () => THEMES[useTheme()] || DARK;

export const A = {
  teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444",
  orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF",
};
