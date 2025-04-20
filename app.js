// Clase para manejar el almacenamiento local
class StorageManager {
    static getRegistros() {
        return JSON.parse(localStorage.getItem('registros')) || [];
    }

    static saveRegistros(registros) {
        localStorage.setItem('registros', JSON.stringify(registros));
    }
}

// Clase para manejar la lógica de la aplicación
class CreditCardManager {
    constructor() {
        this.registros = StorageManager.getRegistros();
        this.form = document.getElementById('registroForm');
        this.tableBody = document.getElementById('registrosBody');
        this.searchInput = document.getElementById('searchInput');
        this.statusFilter = document.getElementById('statusFilter');
        this.franchiseFilter = document.getElementById('franchiseFilter');
        this.alert = document.getElementById('alert');
        this.pagination = document.getElementById('pagination');
        this.recordsSection = document.getElementById('recordsSection');
        this.showRecordsBtn = document.getElementById('showRecords');
        
        this.itemsPerPage = 10;
        this.currentPage = 1;
        this.isTableVisible = false;
        
        this.initializeEventListeners();
        this.renderTable();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.searchInput.addEventListener('input', () => this.filterRegistros());
        this.statusFilter.addEventListener('change', () => this.filterRegistros());
        this.franchiseFilter.addEventListener('change', () => this.filterRegistros());
        this.showRecordsBtn.addEventListener('click', () => this.toggleRecordsVisibility());
    }

    toggleRecordsVisibility() {
        this.isTableVisible = !this.isTableVisible;
        this.recordsSection.style.display = this.isTableVisible ? 'block' : 'none';
        this.showRecordsBtn.innerHTML = this.isTableVisible ? 
            '<i class="fas fa-times"></i> Ocultar registros' : 
            '<i class="fas fa-table"></i> Mostrar registros';
        
        if (this.isTableVisible) {
            this.renderTable();
            this.recordsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showAlert(message, type) {
        this.alert.textContent = message;
        this.alert.className = `alert alert-${type}`;
        this.alert.style.display = 'block';
        
        // Añadir animación de fade-out
        setTimeout(() => {
            this.alert.style.opacity = '0';
            setTimeout(() => {
                this.alert.style.display = 'none';
                this.alert.style.opacity = '1';
            }, 300);
        }, 2700);
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = {
            clienteId: document.getElementById('clienteId').value,
            email: document.getElementById('email').value,
            nombre: document.getElementById('nombre').value,
            numeroTarjeta: document.getElementById('numeroTarjeta').value,
            fechaVencimiento: document.getElementById('fechaVencimiento').value,
            cupoTotal: parseFloat(document.getElementById('cupoTotal').value),
            cupoDisponible: parseFloat(document.getElementById('cupoDisponible').value),
            estado: 'ACTIVO',
            fechaRegistro: new Date().toISOString()
        };

        // Validaciones
        if (!this.validarFecha(formData.fechaVencimiento)) {
            this.showAlert('Formato de fecha inválido. Use MM/YYYY', 'error');
            return;
        }

        if (formData.cupoDisponible > formData.cupoTotal) {
            this.showAlert('El cupo disponible no puede ser mayor al cupo total', 'error');
            return;
        }

        if (this.isTarjetaDuplicada(formData.numeroTarjeta)) {
            this.showAlert('El número de tarjeta ya existe', 'error');
            return;
        }

        // Calcular franquicia y cupo utilizado
        formData.franquicia = this.determinarFranquicia(formData.numeroTarjeta);
        formData.cupoUtilizado = formData.cupoTotal - formData.cupoDisponible;

        this.registros.unshift(formData); // Añadir al principio del array
        StorageManager.saveRegistros(this.registros);
        this.renderTable();
        this.form.reset();
        this.showAlert('Registro guardado exitosamente', 'success');
        
        // Mostrar la tabla si está oculta
        if (!this.isTableVisible) {
            this.toggleRecordsVisibility();
        }
    }

    validarFecha(fecha) {
        const regex = /^(0[1-9]|1[0-2])\/\d{4}$/;
        if (!regex.test(fecha)) return false;
        
        const [mes, año] = fecha.split('/');
        const fechaActual = new Date();
        const fechaVencimiento = new Date(año, mes - 1);
        
        return fechaVencimiento > fechaActual;
    }

    isTarjetaDuplicada(numeroTarjeta) {
        return this.registros.some(registro => 
            registro.numeroTarjeta === numeroTarjeta && registro.estado === 'ACTIVO'
        );
    }

    determinarFranquicia(numeroTarjeta) {
        if (numeroTarjeta.startsWith('4')) return 'VISA';
        if (numeroTarjeta.startsWith('5')) return 'MASTERCARD';
        if (numeroTarjeta.startsWith('3')) return 'AMERICAN EXPRESS';
        return 'OTRA';
    }

    filterRegistros() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const statusFilter = this.statusFilter.value;
        const franchiseFilter = this.franchiseFilter.value;

        let filtered = this.registros.filter(registro => {
            const matchesSearch = 
                registro.clienteId.toLowerCase().includes(searchTerm) ||
                registro.email.toLowerCase().includes(searchTerm) ||
                registro.nombre.toLowerCase().includes(searchTerm);

            const matchesStatus = 
                statusFilter === 'all' || 
                (statusFilter === 'active' && registro.estado === 'ACTIVO') ||
                (statusFilter === 'inactive' && registro.estado === 'INACTIVO');

            const matchesFranchise = 
                franchiseFilter === 'all' || 
                registro.franquicia === franchiseFilter;

            return matchesSearch && matchesStatus && matchesFranchise;
        });

        this.renderTable(filtered);
    }

    renderTable(registros = this.registros) {
        this.tableBody.innerHTML = '';
        
        // Paginación
        const totalPages = Math.ceil(registros.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedRegistros = registros.slice(startIndex, endIndex);
        
        if (registros.length === 0) {
            this.tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 20px;">
                        No hay registros disponibles
                    </td>
                </tr>
            `;
            this.pagination.innerHTML = '';
            return;
        }

        paginatedRegistros.forEach(registro => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${registro.clienteId}</td>
                <td>${registro.email}</td>
                <td>${registro.nombre}</td>
                <td>${this.formatTarjeta(registro.numeroTarjeta)}</td>
                <td>${registro.franquicia}</td>
                <td>${registro.fechaVencimiento}</td>
                <td>
                    <span class="status-badge ${registro.estado === 'ACTIVO' ? 'status-active' : 'status-inactive'}">
                        ${registro.estado}
                    </span>
                </td>
                <td>$${this.formatMoney(registro.cupoTotal)}</td>
                <td>$${this.formatMoney(registro.cupoDisponible)}</td>
                <td>${this.formatCupoUtilizado(registro.cupoTotal, registro.cupoDisponible)}</td>
                <td class="actions">
                    <button class="edit-btn" onclick="app.editarRegistro('${registro.numeroTarjeta}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="app.eliminarRegistro('${registro.numeroTarjeta}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            this.tableBody.appendChild(row);
        });

        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        this.pagination.innerHTML = '';
        
        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            if (i === this.currentPage) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                this.currentPage = i;
                this.renderTable();
            });
            this.pagination.appendChild(button);
        }
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('es-CO').format(amount);
    }

    formatCupoUtilizado(total, disponible) {
        const utilizado = total - disponible;
        const color = utilizado < 0 ? 'color: #e74c3c;' : '';
        return `<span style="${color}">$${this.formatMoney(Math.abs(utilizado))}</span>`;
    }

    editarRegistro(numeroTarjeta) {
        const registro = this.registros.find(r => r.numeroTarjeta === numeroTarjeta);
        if (!registro) return;

        const nuevoCupo = prompt('Ingrese el nuevo cupo total:', registro.cupoTotal);
        
        if (nuevoCupo !== null) {
            const nuevoCupoNum = parseFloat(nuevoCupo);
            if (isNaN(nuevoCupoNum)) {
                this.showAlert('Por favor ingrese un número válido', 'error');
                return;
            }
            
            registro.cupoTotal = nuevoCupoNum;
            registro.cupoUtilizado = registro.cupoTotal - registro.cupoDisponible;
            StorageManager.saveRegistros(this.registros);
            this.renderTable();
            this.showAlert('Cupo actualizado exitosamente', 'success');
        }
    }

    eliminarRegistro(numeroTarjeta) {
        const registro = this.registros.find(r => r.numeroTarjeta === numeroTarjeta);
        if (!registro) return;

        if (confirm('¿Está seguro de que desea eliminar este registro?')) {
            registro.estado = 'INACTIVO';
            StorageManager.saveRegistros(this.registros);
            this.renderTable();
            this.showAlert('Registro eliminado exitosamente', 'success');
        }
    }

    formatTarjeta(numero) {
        return numero.replace(/(\d{4})/g, '$1 ').trim();
    }
}

// Inicializar la aplicación
const app = new CreditCardManager(); 