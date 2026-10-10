import UpdateSubscriptionAction from "@/components/UpdateSubscriptionAction";
export const metadata = { title: "Unsubscribe from event updates", robots: { index: false, follow: false } };
export default async function Page({ searchParams }) { const { token } = await searchParams; return <UpdateSubscriptionAction token={token} action="unsubscribe"/>; }
