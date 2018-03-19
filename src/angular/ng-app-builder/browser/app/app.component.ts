import { Component } from '@angular/core';
import api from '__api';
import { environment } from '../../environments/environment';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  title = api.packageName + '...';
  environment = environment.name;
}
