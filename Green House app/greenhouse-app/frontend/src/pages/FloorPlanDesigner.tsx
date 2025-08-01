import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Save,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  PanTool,
  CropSquare,
  Water,
  Grass,
  LocalFlorist,
  WbSunny,
  Air,
  Undo,
  Redo,
} from '@mui/icons-material';
import { Stage, Layer, Rect, Text, Line, Circle, Group } from 'react-konva';

interface FloorPlanElement {
  id: string;
  type: 'growbed' | 'tank' | 'walkway' | 'equipment' | 'wall';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  name?: string;
  properties?: any;
}

export default function FloorPlanDesigner() {
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<string>('select');
  const [zoom, setZoom] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const stageRef = useRef<any>(null);

  const elementTypes = [
    { type: 'growbed', icon: <Grass />, label: 'Grow Bed' },
    { type: 'tank', icon: <Water />, label: 'Fish Tank' },
    { type: 'walkway', icon: <CropSquare />, label: 'Walkway' },
    { type: 'equipment', icon: <Air />, label: 'Equipment' },
    { type: 'wall', icon: <CropSquare />, label: 'Wall' },
  ];

  const handleAddElement = (type: string) => {
    const newElement: FloorPlanElement = {
      id: `element-${Date.now()}`,
      type: type as any,
      x: 100,
      y: 100,
      width: type === 'tank' ? 150 : 200,
      height: type === 'tank' ? 150 : 100,
      name: `${type} ${elements.length + 1}`,
    };
    setElements([...elements, newElement]);
  };

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'greenhouse-floor-plan.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getElementColor = (type: string) => {
    switch (type) {
      case 'growbed':
        return '#4caf50';
      case 'tank':
        return '#2196f3';
      case 'walkway':
        return '#9e9e9e';
      case 'equipment':
        return '#ff9800';
      case 'wall':
        return '#424242';
      default:
        return '#ccc';
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            position: 'relative',
            height: '100%',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Elements
          </Typography>
          <List>
            {elementTypes.map((elem) => (
              <ListItem
                button
                key={elem.type}
                onClick={() => handleAddElement(elem.type)}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { backgroundColor: '#f5f5f5' },
                }}
              >
                <Box sx={{ mr: 2, color: getElementColor(elem.type) }}>
                  {elem.icon}
                </Box>
                <ListItemText primary={elem.label} />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Properties
          </Typography>
          {selectedElement && (
            <Box>
              <TextField
                fullWidth
                label="Name"
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Width (m)"
                type="number"
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Length (m)"
                type="number"
                size="small"
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Type</InputLabel>
                <Select label="Type">
                  <MenuItem value="nft">NFT System</MenuItem>
                  <MenuItem value="dwc">DWC System</MenuItem>
                  <MenuItem value="ebb_flow">Ebb & Flow</MenuItem>
                  <MenuItem value="drip">Drip System</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            Statistics
          </Typography>
          <Box>
            <Chip label={`Total Elements: ${elements.length}`} sx={{ mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              Total Area: 450 m²
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Growing Area: 280 m²
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Efficiency: 62%
            </Typography>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <ButtonGroup variant="contained" size="small">
              <Button
                onClick={() => setTool('select')}
                variant={tool === 'select' ? 'contained' : 'outlined'}
              >
                <PanTool />
              </Button>
              <Button
                onClick={() => setTool('draw')}
                variant={tool === 'draw' ? 'contained' : 'outlined'}
              >
                <CropSquare />
              </Button>
            </ButtonGroup>
            <IconButton onClick={() => setZoom(zoom + 0.1)} sx={{ ml: 2 }}>
              <ZoomIn />
            </IconButton>
            <IconButton onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
              <ZoomOut />
            </IconButton>
            <IconButton sx={{ ml: 2 }}>
              <Undo />
            </IconButton>
            <IconButton>
              <Redo />
            </IconButton>
          </Box>
          <Box>
            <Button startIcon={<Upload />} sx={{ mr: 1 }}>
              Import
            </Button>
            <Button startIcon={<Download />} onClick={handleExport} sx={{ mr: 1 }}>
              Export
            </Button>
            <Button startIcon={<Save />} variant="contained">
              Save
            </Button>
          </Box>
        </Paper>

        <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', overflow: 'auto' }}>
          <Stage
            width={window.innerWidth - 300}
            height={window.innerHeight - 200}
            ref={stageRef}
            scaleX={zoom}
            scaleY={zoom}
          >
            <Layer>
              {/* Grid */}
              {Array.from({ length: 20 }).map((_, i) => (
                <Line
                  key={`h-${i}`}
                  points={[0, i * 50, 1000, i * 50]}
                  stroke="#e0e0e0"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 20 }).map((_, i) => (
                <Line
                  key={`v-${i}`}
                  points={[i * 50, 0, i * 50, 1000]}
                  stroke="#e0e0e0"
                  strokeWidth={1}
                />
              ))}

              {/* Elements */}
              {elements.map((element) => (
                <Group
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  draggable
                  onClick={() => setSelectedElement(element.id)}
                  onDragEnd={(e) => {
                    const newElements = elements.map((el) =>
                      el.id === element.id
                        ? { ...el, x: e.target.x(), y: e.target.y() }
                        : el
                    );
                    setElements(newElements);
                  }}
                >
                  {element.type === 'tank' ? (
                    <Circle
                      radius={element.width / 2}
                      fill={getElementColor(element.type)}
                      stroke={selectedElement === element.id ? '#000' : 'transparent'}
                      strokeWidth={2}
                    />
                  ) : (
                    <Rect
                      width={element.width}
                      height={element.height}
                      fill={getElementColor(element.type)}
                      stroke={selectedElement === element.id ? '#000' : 'transparent'}
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    text={element.name}
                    fontSize={14}
                    fill="white"
                    width={element.width}
                    align="center"
                    verticalAlign="middle"
                    y={element.type === 'tank' ? 0 : element.height / 2 - 7}
                  />
                </Group>
              ))}
            </Layer>
          </Stage>
        </Box>
      </Box>
    </Box>
  );
}