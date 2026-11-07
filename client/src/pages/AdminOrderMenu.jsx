import { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import { useBusiness } from '../context/BusinessContext';
import { Loading } from '../components/ui';
import CustomerMenu from './CustomerMenu';

/** Staff-facing ordering menu: the same menu with the admin return control. */
export default function AdminOrderMenu() {
  const { business, loading } = useBusiness();
  if (loading || !business) return <Loading />;
  return <CustomerMenu slug={business.slug} adminMode />;
}
