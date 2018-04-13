import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DrcpAdminComponent } from './drcp-admin.component';

describe('DrcpAdminComponent', () => {
	let component: DrcpAdminComponent;
	let fixture: ComponentFixture<DrcpAdminComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [DrcpAdminComponent]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DrcpAdminComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
	it('should have as title \'app\'', async (() => {
		const fixture = TestBed.createComponent(DrcpAdminComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app.title).toEqual('app');
	}));
	it('should render title in a h1 tag', async (() => {
		const fixture = TestBed.createComponent(DrcpAdminComponent);
		fixture.detectChanges();
		const compiled = fixture.debugElement.nativeElement;
		expect(compiled.querySelector('h1').textContent).toContain('Welcome to app!');
	}));
});
