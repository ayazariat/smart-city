declare module 'react-leaflet-heatmap-layer-v3' {
  import { FC } from 'react';
  
  interface HeatmapLayerProps<T = Record<string, unknown>> {
    points: T[];
    longitudeExtractor: (point: T) => number;
    latitudeExtractor: (point: T) => number;
    intensityExtractor?: (point: T) => number;
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
