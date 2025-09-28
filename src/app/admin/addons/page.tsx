import { AddonsClient } from './_components/AddonsClient';

export default function AddonsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Service Add-ons</h1>
        <p className="text-muted-foreground">
          Manage add-ons for your services to increase revenue and provide more options to customers.
        </p>
      </div>
      <AddonsClient />
    </div>
  );
}
