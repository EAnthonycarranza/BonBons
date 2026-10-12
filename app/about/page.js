import AboutContent from "@/components/AboutContent";
import { getPublishedPage } from "@/lib/page-content-data";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const content=await getPublishedPage("about");
  return {title:content.title,description:content.description};
}
export default async function AboutPage() {
  return <AboutContent content={await getPublishedPage("about")}/>;
}
