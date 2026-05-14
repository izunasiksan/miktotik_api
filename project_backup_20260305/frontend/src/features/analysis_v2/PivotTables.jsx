import React from 'react';
import PivotSpeedTable from './PivotSpeedTable';
import PivotResourceTable from './PivotResourceTable';
import PivotInterfaceTable from './PivotInterfaceTable';
import PivotServiceTable from './PivotServiceTable';
import PivotDailySummary from './PivotDailySummary';

const PivotTables = ({ pivotTables }) => {
  if (!pivotTables) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-8">
      {/* Speed Tables */}
      <PivotSpeedTable pivotTables={pivotTables} />
      
      {/* Resource Tables */}
      <PivotResourceTable pivotTables={pivotTables} />
      
      {/* Interface Tables */}
      <PivotInterfaceTable pivotTables={pivotTables} />
      
      {/* Service Tables (PPPoE, Hotspot) */}
      <PivotServiceTable pivotTables={pivotTables} />
      
      {/* Daily Summary Table */}
      <PivotDailySummary pivotTables={pivotTables} />
    </div>
  );
};

export default PivotTables;
