/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import {
     Chart as ChartJS,
     ArcElement,
     Tooltip,
     Legend,
     Title,
     CategoryScale,
     LinearScale,
     BarElement,
     RadialLinearScale,
     PointElement,
     LineElement,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
     ArcElement,
     Tooltip,
     Legend,
     Title,
     CategoryScale,
     LinearScale,
     BarElement,
     RadialLinearScale,
     PointElement,
     LineElement,
);


/**
 * Component ColumnGraph - Hiển thị biểu đồ cột sử dụng Chart.js.
 *
 * @param {Array} labels - Mảng chứa các nhãn cho các trục X của biểu đồ cột.
 *                          Ví dụ: `['Danh mục 1', 'Danh mục 2', 'Danh mục 3']`
 * @param {Array} data - Mảng chứa các giá trị dữ liệu cho mỗi nhãn, tương ứng với các trục Y.
 *                       Ví dụ: `[10, 20, 30]`
 * @param {string} text - Tiêu đề hiển thị trên biểu đồ cột.
 *                        Ví dụ: `'Tiêu đề biểu đồ cột'`
 */

const ColumnGraph = ({ labels, data, text }) => {
     const chartRef = useRef(null);
     useEffect(() => {
         const chart = chartRef.current && ChartJS.getChart(chartRef.current.id);
         return () => {
             if (chart) {
                 chart.destroy();
             }
         };
     }, []);  
 
     return (
         <Bar
             ref={chartRef}  // Gán ref cho phần tử Bar
             id="columnGraph"
             data={{
                 labels: labels || [],
                 datasets: [
                     {
                         data: data || [],
                         backgroundColor: [
                             '#67b7dc',
                             '#6794DC',
                             '#6771DC',
                             '#8067DC',
                             '#C767DC',
                             '#DC67AB',
                             '#DC6788',
                             '#DCAF67',
                         ],
                     },
                 ],
             }}
             options={{
                 plugins: {
                     title: {
                         display: true,
                         size: 13,
                         text: text || ' ',
                         padding: 20,
                         color: '#605f5f',
                         position: 'bottom',
                     },
                     legend: {
                         display: true,
                         labels: {
                             color: '#605f5f',
                             generateLabels: (chart) => {
                                 const dataset = chart.data.datasets[0];
                                 return dataset.data.map((dataPoint, index) => ({
                                     text: labels[index],
                                     fillStyle: dataset.backgroundColor[index],
                                     strokeStyle: dataset.backgroundColor[index],
                                     hidden: false,
                                     index,
                                 }));
                             },
                         },
                     },
                 },
                 maintainAspectRatio: false,
                 responsive: true,
                 scales: {
                     x: {
                         ticks: {
                             callback(val) {
                                 const label = this.getLabelForValue(val);
                                 return label.length > 10 ? `${label.substring(0, 10)}...` : label;
                             },
                             maxRotation: 0,
                             minRotation: 0,
                         },
                     },
                 },
             }}
         />
     );
 };


/**
* Component CircleGraph - Hiển thị biểu đồ hình tròn sử dụng Chart.js.
*
* @param {Array} labels - Mảng chứa các nhãn cho các phân đoạn của biểu đồ.
*                           Ví dụ: `['Danh mục 1', 'Danh mục 2', 'Danh mục 3']`
* @param {Array} data - Mảng chứa các giá trị dữ liệu tương ứng với các nhãn.
*                       Ví dụ: `[10, 20, 30]`
* @param {string} text - Tiêu đề hiển thị trên biểu đồ.
*                        Ví dụ: `'Tiêu đề biểu đồ hình tròn'`
* @param {string} [legendPosition='top'] - Vị trí của chú giải (legend).
*                                          Có thể là: `'top'`, `'left'`, `'bottom'`, `'right'`.
*                                          Mặc định là `'top'`.
*/
 
 const CircleGraph = ({ labels, data, text, legendPosition = 'top' }) => {
     const chartRef = useRef(null);
 
     useEffect(() => {
         const chart = chartRef.current && ChartJS.getChart(chartRef.current.id);
         return () => {
             if (chart) {
                 chart.destroy();
             }
         };
     }, []);
 
     return (
         <Pie
             ref={chartRef}  // Gán ref cho phần tử Pie
             id="circleGraph"
             data={{
                 labels: labels,
                 datasets: [
                     {
                         backgroundColor: [
                             '#67b7dc',
                             '#6794DC',
                             '#6771DC',
                             '#8067DC',
                             '#C767DC',
                             '#DC67AB',
                             '#DC6788',
                             '#DCAF67',
                         ],
                         data: data || [],
                     },
                 ],
             }}
             options={{
                 plugins: {
                     title: {
                         display: true,
                         text: text,
                         font: {
                             size: 13,
                         },
                         padding: {
                             top: 20,
                             bottom: 20,
                         },
                         color: '#605f5f',
                         position: 'bottom',
                     },
                     legend: {
                         display: true,
                         position: legendPosition,
                         labels: {
                             color: '#605f5f',
                             boxWidth: 20,
                             font: {
                                 size: 12,
                             },
                         },
                     },
                 },
                 maintainAspectRatio: false,
                 responsive: true,
             }}
         />
     );
 };

 /**
 * Component LineGraph - Hiển thị biểu đồ đường (Line chart) sử dụng Chart.js.
 *
 * @param {Array} labels - Mảng chứa các nhãn cho trục X của biểu đồ.
 *                         Ví dụ: `['Tháng 1', 'Tháng 2', 'Tháng 3']`
 *
 * @param {Array} data - Mảng chứa các đối tượng dữ liệu cho các dòng trên biểu đồ.
 *                       Mỗi đối tượng có dạng:
 *                       {
 *                           name: (string) Tên của dòng (ví dụ: 'Dòng 1', 'Dòng 2'),
 *                           values: (Array) Mảng các giá trị dữ liệu cho dòng đó.
 *                       }
 *                       Ví dụ: 
 *                       ```js
 *                       [
 *                           { name: 'Dòng 1', values: [10, 20, 30] },
 *                           { name: 'Dòng 2', values: [15, 25, 35] }
 *                       ]
 *                       ```
 *
 * @param {string} text - Tiêu đề hiển thị trên biểu đồ.
 *                        Ví dụ: `'Biểu đồ đường mẫu'`
 *
 * @param {Array} lineColors - Mảng chứa các đối tượng màu sắc cho các dòng. Mỗi đối tượng có thể có các thuộc tính:
 *                             - `background`: Màu nền của dòng (mặc định `'rgba(0, 123, 255, 0.6)'`).
 *                             - `border`: Màu viền của dòng (mặc định `'rgba(0, 123, 255, 1)'`).
 *                             Ví dụ:
 *                             ```js
 *                             [
 *                                 { background: 'rgba(255, 99, 132, 0.2)', border: 'rgba(255, 99, 132, 1)' },
 *                                 { background: 'rgba(54, 162, 235, 0.2)', border: 'rgba(54, 162, 235, 1)' }
 *                             ]
 *                             ```
 */

const LineGraph = ({ labels, data, text, lineColors }) => {
     const chartRef = useRef(null);

     const chartData = {
          labels: labels,
          datasets: data?.map((dataset, index) => ({
               label: dataset.name, // Sử dụng tên từ dataset để làm nhãn cho từng dòng
               data: dataset.values, // Dữ liệu của dòng tương ứng
               fill: false,
               backgroundColor: lineColors[index]?.background || 'rgba(0, 123, 255, 0.6)',
               borderColor: lineColors[index]?.border || 'rgba(0, 123, 255, 1)',
               tension: 0.3, // Độ cong của đường
          })),
     };

     const chartOptions = {
         plugins: {
             title: {
                 display: true,
                 text: text,
                 position: 'bottom',
                 color: '#605f5f',
             },
             legend: {
                 display: true, // Hiển thị legend để người dùng biết từng dòng là gì
             },
         },
         elements: {
             line: {
                 borderWidth: 3,
             },
         },
         maintainAspectRatio: false,
         responsive: true,
         scales: {
             x: {
                 ticks: {
                     callback: function (val, index, values) {
                         const label = labels[index] || '';
                         return label.length > 20 ? `${label.substring(0, 20)}...` : label;
                     },
                     maxRotation: 0,
                     minRotation: 0,
                 },
             },
         },
     };
 
     return <Line ref={chartRef} data={chartData} options={chartOptions} />;
 };
 

export { ColumnGraph, CircleGraph, LineGraph }