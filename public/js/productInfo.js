document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const productItems = document.querySelectorAll('.productItem');

    searchInput.addEventListener('input', function() {
        const searchTerm = searchInput.value.toLowerCase();

        productItems.forEach(item => {
            const productName = item.dataset.productName.toLowerCase();
            if (productName.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
});
