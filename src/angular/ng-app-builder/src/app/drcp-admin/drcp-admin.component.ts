import { Component, OnInit } from '@angular/core';
import api from '__api';
import { environment } from '../../environments/environment';
@Component({
	// selector: 'drng-drcp-admin',
	templateUrl: './drcp-admin.component.html',
	styleUrls: ['./drcp-admin.component.less']
})
export class DrcpAdminComponent implements OnInit {
	title = api.packageName + '...';
	environment = environment.name;
	constructor() { }

	ngOnInit() {
	}

}
