import { useI18n } from "../i18n/I18nProvider";
import { itemLabel, itemUnit } from "../i18n/labels";
import { CATALOGUE, type ItemId } from "../pricing/catalogue";
import { formatMoney } from "../pricing/shared";
import { useWorkspace } from "./workspace";

/** Price text for the form labels: "Additional screen ($160 / screen)", or just the name until a country is chosen. */
export function usePricing() {
  const { estimate } = useWorkspace();
  const { t } = useI18n();
  const { region } = estimate;

  /**
   * `perUnit` adds the catalogue unit ("/ screen") for items that are bought in a quantity. Monthly items say
   * "/ month". `name` replaces the catalogue name when the screen words the choice differently.
   */
  const priced = (id: ItemId, perUnit = false, name: string = itemLabel(t, id)): string => {
    if (!region) return name;
    const price = formatMoney(CATALOGUE[id].prices[region.id], region);
    if (CATALOGUE[id].billing === "monthly") return t("app.pricedMonthly", { name, price });
    return perUnit ? t("app.priced", { name, price, unit: itemUnit(t, id) }) : t("app.pricedOnce", { name, price });
  };

  return { region, priced };
}
