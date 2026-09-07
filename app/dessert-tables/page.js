import { redirect } from "next/navigation";

export const metadata = {
  title: "Shop cake pops",
};

export default function DessertTablesPage() {
  redirect("/shop");
}
