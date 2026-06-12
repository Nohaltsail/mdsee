// Auto-generated from 笔记1.md
export const defaultContent = `# Typora 格式示例：快速排序算法详解

## 1. 算法概述

快速排序（Quicksort）是由*Tony Hoare*在1960年发明的一种**高效排序算法**，采用分治策略。平均时间复杂度为 O(n log n)，最坏情况为 O(n²)。

### 算法特点
- **原地排序**（in-place）
- **不稳定排序**
- **递归实现**
- 实际应用中通常是最快的通用排序算法

## 2. 数学原理

### 时间复杂度分析公式

$$
T(n) = O(n) + 2T\\left(\\frac{n}{2}\\right)
$$

### 分区概率分析

对于随机选择的基准元素，分区后左右子数组大小的期望：

$$
E[左子数组大小] = E[右子数组大小] = \\frac{n-1}{2}
$$

## 3. 算法实现（C++）

\`\`\`cpp
#include <iostream>
#include <vector>
#include <cstdlib>
#include <ctime>

using namespace std;

/**
 * 分区函数 - 选择基准元素并重新排列数组
 * @param arr 待排序数组
 * @param low 起始索引
 * @param high 结束索引
 * @return 基准元素的最终位置
 */
int partition(vector<int>& arr, int low, int high) {
    // 随机选择基准元素，避免最坏情况
    int pivotIndex = low + rand() % (high - low + 1);
    swap(arr[pivotIndex], arr[high]);
    
    int pivot = arr[high];  // 基准元素
    int i = low - 1;        // 较小元素的索引
    
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    
    swap(arr[i + 1], arr[high]);
    return i + 1;
}

/**
 * 快速排序递归函数
 */
void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        // pi是分区索引，arr[pi]已在正确位置
        int pi = partition(arr, low, high);
        
        // 递归排序分区前后的元素
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

/**
 * 包装函数
 */
void quickSort(vector<int>& arr) {
    srand(time(nullptr));  // 初始化随机种子
    quickSort(arr, 0, arr.size() - 1);
}

int main() {
    vector<int> arr = {10, 7, 8, 9, 1, 5};
    
    cout << "原始数组: ";
    for (int num : arr) cout << num << " ";
    cout << endl;
    
    quickSort(arr);
    
    cout << "排序后数组: ";
    for (int num : arr) cout << num << " ";
    cout << endl;
    
    return 0;
}
\`\`\`

## 4. 算法性能比较

| 算法     | 平均时间复杂度 | 最坏时间复杂度 | 空间复杂度 | 稳定性 |
| -------- | -------------- | -------------- | ---------- | ------ |
| 快速排序 | O(n log n)     | O(n²)          | O(log n)   | 否     |
| 归并排序 | O(n log n)     | O(n log n)     | O(n)       | 是     |
| 堆排序   | O(n log n)     | O(n log n)     | O(1)       | 否     |
| 插入排序 | O(n²)          | O(n²)          | O(1)       | 是     |

## 5. 算法步骤可视化

\`\`\`mermaid
graph LR
    A[开始快速排序] --> B{数组长度 <= 1?}
    B -->|是| C[返回]
    B -->|否| D[选择基准元素]
    D --> E[分区操作]
    E --> F[基准元素归位]
    F --> G[递归排序左子数组]
    F --> H[递归排序右子数组]
    G --> I[排序完成]
    H --> I
\`\`\`



## 6. 时间复杂度分布

\`\`\`mermaid
pie
    title 快速排序操作分布
    "比较操作" : 45
    "交换操作" : 30
    "递归调用" : 15
    "基准选择" : 5
    "其他" : 5
\`\`\`

## 7. 算法优化技巧

### 7.1 基准选择策略

1. **三数取中法**
   \`\`\`cpp
   int mid = low + (high - low) / 2;
   // 选择low、mid、high的中值作为基准
   \`\`\`

2. **随机化基准**
   \`\`\`cpp
   // 如上述代码所示，随机选择减少最坏情况
   \`\`\`

### 7.2 小数组优化

当子数组小于某个阈值时，切换到插入排序：

\`\`\`cpp
void hybridQuickSort(vector<int>& arr, int low, int high) {
    if (high - low + 1 <= 10) {  // 阈值设为10
        insertionSort(arr, low, high);
        return;
    }
    // ... 快速排序逻辑
}
\`\`\`

## 8. 应用场景

### 适用场景
- 大规模数据排序
- 内存受限环境
- 不需要稳定排序的场景

### 不适用场景
- 需要稳定排序的场合
- 已基本有序的小数据
- 对最坏情况时间复杂度敏感的场景

## 9. 数学证明

### 平均情况时间复杂度推导

设 $C(n)$ 为快速排序的平均比较次数：

$$
C(n) = (n-1) + \\frac{1}{n}\\sum_{k=0}^{n-1}[C(k) + C(n-1-k)]
$$

解此递归方程可得：

$$
C(n) \\approx 2n \\ln n \\approx 1.39n \\log_2 n
$$

---

**注意**：要显示此文档中的Mermaid图表（饼图和流程图），请确保Typora版本为0.9.81或更高，并在设置中启用了Mermaid支持（文件 → 偏好设置 → Markdown → 图表）。`
