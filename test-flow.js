// Quick test script for Scene Flow debugging
// Open browser console and paste this code to test

console.log('=== Scene Flow Debug Test ===');

// Test 1: Check localStorage
console.log('1. Checking localStorage:');
const activeFlow = localStorage.getItem('activeFlowName');
console.log('Active flow:', activeFlow);

// Test 2: Test API connectivity
console.log('2. Testing API connectivity:');
fetch('http://localhost:5001/api/assets/list/flow')
  .then(response => response.json())
  .then(data => {
    console.log('Flow list API result:', data);
    
    if (data.success && data.assets.length > 0) {
      // Test 3: Try loading the first flow
      const firstFlow = data.assets[0].name;
      console.log('3. Testing flow loading with:', firstFlow);
      
      return fetch(`http://localhost:5001/api/assets/load/flow/${firstFlow}`);
    } else {
      console.log('No flows found');
    }
  })
  .then(response => response?.json())
  .then(data => {
    if (data) {
      console.log('Flow load result:', data);
      
      if (data.success && data.data) {
        const flowData = typeof data.data.code === 'string' 
          ? JSON.parse(data.data.code) 
          : data.data.code;
        
        console.log('Parsed flow data:', flowData);
        
        if (flowData && flowData.nodes && flowData.edges) {
          const gameStartNode = flowData.nodes.find(node => node.name === 'Game Start');
          console.log('Game Start node:', gameStartNode);
          
          if (gameStartNode) {
            const startEdges = flowData.edges.filter(edge => edge.from === gameStartNode.id);
            console.log('Outgoing edges from Game Start:', startEdges);
            
            if (startEdges.length > 0) {
              const firstSceneNode = flowData.nodes.find(node => node.id === startEdges[0].to);
              console.log('First scene to load:', firstSceneNode);
            }
          }
        }
      }
    }
  })
  .catch(error => {
    console.error('API test failed:', error);
    console.log('Make sure the backend server is running on http://localhost:5001');
  });

// Test 4: Check if we're on the right page
console.log('4. Current page:', window.location.pathname);
console.log('=== End Debug Test ===');
