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
  bg:"#F4F7FB", panel:"#FFFFFF", panelAlt:"#EEF3F8", panel2:"#EEF3F8",
  border:"#C0CDD8", borderMd:"#A0B4C4",
  text:"#0D1B2A",       // near-black — main body text
  textDim:"#1E3448",    // dark navy — secondary text
  dim:"#1E3448",
  textMute:"#374F66",   // medium-dark — captions/labels, clearly readable
  mute:"#374F66",
  white:"#0A1525",      // darkest — headings
  input:"#FFFFFF", inputBorder:"#98B8D0",
  rowA:"#FFFFFF", rowB:"#F4F8FC", scroll:"#98B8D0", headerBg:"#FFFFFF",
  teal:"#007A5E", blue:"#1A5FCC", red:"#C0181E",
  orange:"#B05000", gold:"#8A6A00", green:"#006B3C", purple:"#6A2FBB",
};

export const THEMES = { dark: DARK, light: LIGHT };
export const useColors = () => THEMES[useTheme()] || DARK;

export const A = {
  teal:"#00D4AA", blue:"#1A7AFF", red:"#FF4444",
  orange:"#FF8C00", gold:"#FFD700", green:"#00CC88", purple:"#AA66FF",
};
