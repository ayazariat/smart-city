declare module 'react-leaflet-heatmap-layer-v3' {
  import { FC } from 'react';
  
  interface HeatmapLayerProps {
    points: any[];
    longitudeExtractor: (point: any) => number;
    latitudeExtractor: (point: any) => number;
    intensityExtractor?: (point: any) => number;
    radius?: number;
    maxOpacity?: number;
    gradient?: Record<number, string>;
  }
  
  const HeatmapLayer: FC<HeatmapLayerProps>;
  export default HeatmapLayer;
}

declare module 'react-leaflet-markercluster' {
  import { FC, ReactNode } from 'react';
  
  interface MarkerClusterGroupProps {
    chunkedLoading?: boolean;
    children?: ReactNode;
  }
  
  const MarkerClusterGroup: FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}

declare module 'leaflet/dist/leaflet.css';
