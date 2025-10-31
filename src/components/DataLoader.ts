// Data loading utility for JIRA CSV data
export class DataLoader {
  static async loadCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',');
          
          const data = lines.slice(1).map(line => {
            if (line.trim() === '') return null;
            const values = line.split(',');
            const obj: any = {};
            
            headers.forEach((header, index) => {
              const value = values[index]?.trim() || '';
              
              // Convert numeric fields
              if (header === 'story_points') {
                obj[header] = parseFloat(value) || 0;
              } else {
                obj[header] = value;
              }
            });
            
            return obj;
          }).filter(item => item !== null);
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  static async fetchFromAPI(endpoint: string): Promise<any[]> {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('API request failed');
      return await response.json();
    } catch (error) {
      console.error('API fetch failed:', error);
      throw error;
    }
  }
}