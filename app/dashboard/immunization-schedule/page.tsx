import { redirect } from "next/navigation";

/** @deprecated Use Schedule → Immunization schedule tab */
export default function ImmunizationScheduleRedirectPage() {
  redirect("/dashboard/schedule?tab=eir");
}
