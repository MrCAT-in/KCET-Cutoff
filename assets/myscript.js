let allData = [];
let primaryContainerData = [];

// DOM Elements
const fetchDataBtn = document.getElementById("fetchDataBtn");
const searchResultContainer = document.getElementById("searchResultContainer");
const resultsContainer = document.getElementById("resultsContainer");
const checkboxesContainer = document.getElementById("courseCheckboxesContainer");
const categoryCheckboxesContainer = document.getElementById("categoryCheckboxesContainer");
const instantSearchBar = document.getElementById("instantSearchBar");
const minRankInput = document.getElementById("minRankInput");
const maxRankInput = document.getElementById("maxRankInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn"); 

// Event Listeners for inputs
instantSearchBar.addEventListener('input', applySecondaryFilters);
minRankInput.addEventListener('input', applySecondaryFilters);
maxRankInput.addEventListener('input', applySecondaryFilters);

// CLEAR FILTERS FUNCTION
clearFiltersBtn.addEventListener('click', () => {
    instantSearchBar.value = '';
    minRankInput.value = '';
    maxRankInput.value = '';

    const courseCheckboxes = document.querySelectorAll('.course-checkbox');
    courseCheckboxes.forEach(checkbox => checkbox.checked = false);

    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    categoryCheckboxes.forEach(checkbox => checkbox.checked = false);

    applySecondaryFilters();
});

// MAIN FETCH FUNCTION
fetchDataBtn.addEventListener("click", async() => {
    const year = document.getElementById("yearSelect").value;
    const round = document.getElementById("roundSelect").value;
    const region = document.getElementById("regionSelect").value;
    const professionSelect = document.getElementById("professionSelect");
    
    const profession = professionSelect.value; 
    const professionName = professionSelect.options[professionSelect.selectedIndex].text; 

    // Validation check
    if (year === "yearBlank" || round === "roundBlank" || region === "regionBlank" || profession === "courseBlank") {
        searchResultContainer.style.display = 'flex';
        resultsContainer.innerHTML = '<p class="no-results">Please select a Year, Round, Profession, and Region to begin your search.</p>';
        return; 
    }

    // FIXED: kcet_data is now lowercase
    const fileName = `./assets/kcet_data/${year}/${round}/${region}/${profession}.json`;

    searchResultContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<div class="loader"></div>';
    
    // Clear out old filters
    checkboxesContainer.innerHTML = '';
    categoryCheckboxesContainer.innerHTML = '';
    minRankInput.value = '';
    maxRankInput.value = '';

    try { 
        const response = await fetch(fileName);
    
        if(!response.ok) {
            throw new Error(`Server says: ${response.status}`);
        }

        allData = await response.json();
        
        // Data is already filtered by region via the folder structure
        primaryContainerData = allData; 
        
        generateCourseCheckboxes(primaryContainerData);
        generateCategoryCheckboxes(primaryContainerData);
        
        renderResults(primaryContainerData);

    } catch (error) {
        console.error("Error loading file:", error);
        resultsContainer.innerHTML = `
            <div class="result-card" style="text-align: center; padding: 40px 20px;">
                <h3 style="color: #d32f2f; margin-bottom: 10px;">Data Unavailable</h3>
                <p style="color: #555; font-size: 1.1rem; line-height: 1.5;">
                    The <strong>${professionName}</strong> cutoff data for <strong>${year} Round ${round} (${region})</strong> is missing or currently unavailable.
                </p>
            </div>
        `;
    }
});

// GENERATE COURSES
function generateCourseCheckboxes(data) {
    const uniqueCourses = [...new Set(data.map(item => item.Course))].sort();
    checkboxesContainer.innerHTML = '';

    uniqueCourses.forEach(course => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `course-${course}`;
        checkbox.value = course;
        checkbox.className = 'course-checkbox';
        checkbox.addEventListener('change', applySecondaryFilters);

        const label = document.createElement('label');
        label.htmlFor = `course-${course}`;
        label.textContent = course;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        checkboxesContainer.appendChild(wrapper);
    });
}

// GENERATE CATEGORIES
function generateCategoryCheckboxes(data) {
    const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];
    const categoriesSet = new Set();

    data.forEach(item => {
        for (const [key, value] of Object.entries(item)) {
            // FIXED: Added value !== "--" check
            if (!excludeKeys.includes(key) && value !== null && value !== "" && value !== "--") {
                categoriesSet.add(key);
            }
        }
    });

    const uniqueCategories = [...categoriesSet].sort();
    categoryCheckboxesContainer.innerHTML = '';

    uniqueCategories.forEach(category => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cat-${category}`;
        checkbox.value = category;
        checkbox.className = 'category-checkbox';
        checkbox.addEventListener('change', applySecondaryFilters);

        const label = document.createElement('label');
        label.htmlFor = `cat-${category}`;
        label.textContent = category;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        categoryCheckboxesContainer.appendChild(wrapper);
    });
}

// FILTERING LOGIC
function applySecondaryFilters() {
    const searchTerm = instantSearchBar.value.toLowerCase();
    const checkedCourses = Array.from(document.querySelectorAll('.course-checkbox:checked')).map(cb => cb.value);
    const checkedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);
    
    const minRank = parseInt(minRankInput.value) || 0;
    const maxRank = parseInt(maxRankInput.value) || Infinity;

    const finalData = primaryContainerData.filter(item => {
        const textMatch = item.College.toLowerCase().includes(searchTerm) || item.Course.toLowerCase().includes(searchTerm);
        const courseMatch = checkedCourses.length === 0 ? true : checkedCourses.includes(item.Course);

        let categoryRankMatch = false;
        const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];

        for (const [key, value] of Object.entries(item)) {
            // FIXED: Added value !== "--" check
            if (!excludeKeys.includes(key) && value !== null && value !== "" && value !== "--") {
                const rankVal = parseInt(value);
                
                const isCategoryChecked = checkedCategories.length === 0 || checkedCategories.includes(key);

                if (isCategoryChecked && rankVal >= minRank && rankVal <= maxRank) {
                    categoryRankMatch = true;
                    break; 
                }
            }
        }

        return textMatch && courseMatch && categoryRankMatch;
    });

    renderResults(finalData, checkedCategories);
}

// RENDER CARDS
function renderResults(data, checkedCategories = []) {
    resultsContainer.innerHTML = '';

    if (data.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No colleges match your current filters.</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card'; 

        let ranksHtml = '';
        const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];
        
        for (const [key, value] of Object.entries(item)) {
            // FIXED: Added value !== "--" check
            if (!excludeKeys.includes(key) && value !== null && value !== "" && value !== "--") {
                
                if (checkedCategories.length === 0 || checkedCategories.includes(key)) {
                    ranksHtml += `<span class="rank-badge"><strong>${key}:</strong> ${value}</span> `;
                }
            }
        }

        card.innerHTML = `
            <h3>${item.College}</h3>
            <p class="course-title">${item.Course} <span class="region-tag">(${item.Region})</span></p>
            <div class="ranks-container">
                ${ranksHtml}
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}