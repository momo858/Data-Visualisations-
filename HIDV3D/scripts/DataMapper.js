       // ============================================
        // DATA MAPPER CLASS - Handles data transformation
        // ============================================
        class DataMapper {
            constructor() {
                this.categoryMaps = new Map();
            }

            analyzeColumn(data, columnName) {
                const values = data.map(row => row[columnName]).filter(v => v != null);
                const numericValues = values.filter(v => typeof v === 'number' || !isNaN(parseFloat(v)));
                const isNumeric = numericValues.length > values.length * 0.8;

                return {
                    name: columnName,
                    isNumeric: isNumeric,
                    uniqueCount: new Set(values).size,
                    sampleValues: values.slice(0, 5)
                };
            }

            createCategoryMapping(data, columnName) {
                const uniqueValues = [...new Set(data.map(row => row[columnName]).filter(v => v != null))];
                const mapping = new Map();
                uniqueValues.forEach((value, index) => {
                    mapping.set(value, index);
                });
                this.categoryMaps.set(columnName, mapping);
                return mapping;
            }

            mapToNumeric(data, columnName) {
                const analysis = this.analyzeColumn(data, columnName);

                if (analysis.isNumeric) {
                    return data.map(row => {
                        const val = row[columnName];
                        return typeof val === 'number' ? val : parseFloat(val);
                    });
                } else {
                    const mapping = this.createCategoryMapping(data, columnName);
                    return data.map(row => mapping.get(row[columnName]) ?? 0);
                }
            }

            getCategoryMapping(columnName) {
                return this.categoryMaps.get(columnName);
            }
        }
