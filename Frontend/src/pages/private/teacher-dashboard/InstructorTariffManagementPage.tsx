import { Tag } from "lucide-react";

import { TariffTab } from "./tabs/TariffTab";

export default function InstructorTariffManagementPage() {
  return (
    <main className="dsp-instructor-page dsp-tariff-management-page">
      <header className="dsp-tariff-page-header">
        <div className="dsp-tariff-page-header__icon"><Tag size={22} /></div>
        <div>
          <span className="dsp-profile-eyebrow">Instructor business</span>
          <h1>Tariff Management</h1>
          <p>Manage lesson pricing, discounts and package offers.</p>
        </div>
      </header>
      <TariffTab />
    </main>
  );
}
