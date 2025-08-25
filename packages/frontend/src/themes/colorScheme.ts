import { computed, ref, watch } from "vue";
import { useMediaQuery } from "@vueuse/core";

export type ColorScheme = "light" | "dark";

const LOCAL_STORAGE_KEY = {
	SELECTED_COLOR_SCHEME: "SELECTED_COLOR_SCHEME",
} as const satisfies Record<string, string>;

const FALLBACK_COLOR_SCHEME = "light" as const satisfies ColorScheme;

const isPreferredLightColorScheme = useMediaQuery("(prefers-color-scheme: light)");
const isPreferredDarkColorScheme = useMediaQuery("(prefers-color-scheme: dark)");

const preferredColorScheme = computed<ColorScheme>(() => {
  if (isPreferredLightColorScheme.value) return "light"
  if (isPreferredDarkColorScheme.value) return "dark";
  return FALLBACK_COLOR_SCHEME;
});

export const selectedColorScheme = ref<ColorScheme>();

export const colorScheme = computed(() => {
  return selectedColorScheme.value ?? preferredColorScheme.value;
});

export const useColorScheme = () => {
  const value = localStorage.getItem(LOCAL_STORAGE_KEY.SELECTED_COLOR_SCHEME);

  if (value === "light") {
    selectedColorScheme.value = "light";
  } else if (value === "dark") {
    selectedColorScheme.value = "dark";
  }

  watch([colorScheme], ([value]) => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta === null) {
      meta = document.createElement("meta");
      meta.name = "color-scheme";
      document.head.insertAdjacentElement("beforeend", meta);
    }

    switch (value) {
      case "light": {
        meta.content = "only light";
        break;
      }
      case "dark": {
        meta.content = "only dark";
        break;
      }
    }
  }, {
    immediate: true,
  });

  watch([selectedColorScheme], ([value]) => {
    if (value !== undefined) {
      localStorage.setItem(LOCAL_STORAGE_KEY.SELECTED_COLOR_SCHEME, value);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY.SELECTED_COLOR_SCHEME);
    }
  });
};
